import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import si from "systeminformation";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 4000;
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL || 2000);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// Serve built frontend if it exists (production single-binary mode)
const clientDist = join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

// ---- Static system info (collected once, rarely changes) ----
let staticInfo = null;
async function loadStaticInfo() {
  const [osInfo, cpu, mem, system, time, defaultIface, ifaces] =
    await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.system(),
      si.time(),
      si.networkInterfaceDefault(),
      si.networkInterfaces(),
    ]);

  // Private IPv4 from the default network interface
  const ifaceList = Array.isArray(ifaces) ? ifaces : [ifaces];
  const primary =
    ifaceList.find((i) => i.iface === defaultIface) ||
    ifaceList.find((i) => i.ip4 && !i.internal) ||
    {};

  staticInfo = {
    hostname: osInfo.hostname,
    os: `${osInfo.distro} ${osInfo.release}`,
    platform: osInfo.platform,
    arch: osInfo.arch,
    kernel: osInfo.kernel,
    cpuBrand: `${cpu.manufacturer} ${cpu.brand}`,
    cpuCores: cpu.cores,
    cpuPhysicalCores: cpu.physicalCores,
    cpuSpeed: cpu.speed,
    totalMem: mem.total,
    manufacturer: system.manufacturer,
    model: system.model,
    timezone: time.timezone,
    privateIp: primary.ip4 || null,
    iface: primary.iface || defaultIface || null,
    mac: primary.mac || null,
    // public IP + location filled in asynchronously below
    publicIp: null,
    location: null,
  };

  // Public IP + geolocation (best-effort, won't block startup on failure)
  fetchPublicLocation()
    .then((geo) => {
      if (geo) {
        staticInfo.publicIp = geo.ip;
        staticInfo.location = geo.location;
      }
    })
    .catch(() => {});

  return staticInfo;
}

// Resolve public IP + city/country via a free no-key geolocation API.
async function fetchPublicLocation() {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://ipwho.is/", { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const d = await res.json();
    if (d.success === false) return null;
    const loc = [d.city, d.region, d.country].filter(Boolean).join(", ");
    return { ip: d.ip || null, location: loc || null };
  } catch {
    return null;
  }
}

// ---- Live metrics snapshot ----
async function getMetrics() {
  const [load, mem, fsSize, net, temp, disksIO, processes, time] =
    await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.cpuTemperature(),
      si.disksIO().catch(() => ({ rIO_sec: null, wIO_sec: null })),
      si.processes().catch(() => ({ all: null, running: null })),
      si.time(),
    ]);

  const primaryNet = net && net[0] ? net[0] : {};

  return {
    timestamp: Date.now(),
    uptime: time.uptime,
    cpu: {
      load: round(load.currentLoad),
      user: round(load.currentLoadUser),
      system: round(load.currentLoadSystem),
      perCore: (load.cpus || []).map((c) => round(c.load)),
    },
    memory: {
      total: mem.total,
      used: mem.active,
      free: mem.available,
      usedPercent: round((mem.active / mem.total) * 100),
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused,
    },
    temperature: {
      main: temp.main != null && temp.main > 0 ? round(temp.main) : null,
      cores: (temp.cores || []).filter((c) => c > 0).map((c) => round(c)),
      max: temp.max != null && temp.max > 0 ? round(temp.max) : null,
    },
    disks: fsSize
      .filter((d) => d.size > 0)
      .map((d) => ({
        fs: d.fs,
        mount: d.mount,
        type: d.type,
        size: d.size,
        used: d.used,
        usePercent: round(d.use),
      })),
    diskIO: {
      readPerSec: disksIO.rIO_sec != null ? round(disksIO.rIO_sec) : null,
      writePerSec: disksIO.wIO_sec != null ? round(disksIO.wIO_sec) : null,
    },
    network: {
      iface: primaryNet.iface,
      rxSec: primaryNet.rx_sec != null ? round(primaryNet.rx_sec) : 0,
      txSec: primaryNet.tx_sec != null ? round(primaryNet.tx_sec) : 0,
      rxTotal: primaryNet.rx_bytes || 0,
      txTotal: primaryNet.tx_bytes || 0,
    },
    processes: {
      all: processes.all,
      running: processes.running,
    },
  };
}

function round(n) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.round(n * 10) / 10;
}

// ---- REST endpoints ----
app.get("/api/info", async (_req, res) => {
  try {
    res.json(staticInfo || (await loadStaticInfo()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/metrics", async (_req, res) => {
  try {
    res.json(await getMetrics());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- WebSocket realtime broadcast ----
const clients = new Set();

wss.on("connection", async (ws) => {
  clients.add(ws);
  console.log(`[ws] client connected (${clients.size} total)`);

  // Send static info immediately on connect
  try {
    const info = staticInfo || (await loadStaticInfo());
    ws.send(JSON.stringify({ type: "info", data: info }));
    ws.send(JSON.stringify({ type: "metrics", data: await getMetrics() }));
  } catch (e) {
    console.error("[ws] initial send failed:", e.message);
  }

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[ws] client disconnected (${clients.size} total)`);
  });
  ws.on("error", () => clients.delete(ws));
});

// Single polling loop shared by all clients
let polling = false;
async function broadcastLoop() {
  if (polling) return;
  polling = true;
  try {
    if (clients.size > 0) {
      const metrics = await getMetrics();
      const payload = JSON.stringify({ type: "metrics", data: metrics });
      for (const ws of clients) {
        if (ws.readyState === ws.OPEN) ws.send(payload);
      }
    }
  } catch (e) {
    console.error("[poll] error:", e.message);
  } finally {
    polling = false;
  }
}
setInterval(broadcastLoop, POLL_INTERVAL);

server.listen(PORT, () => {
  console.log(`\n  sysapp server running`);
  console.log(`  HTTP   http://localhost:${PORT}`);
  console.log(`  WS     ws://localhost:${PORT}/ws`);
  console.log(`  poll   every ${POLL_INTERVAL}ms\n`);
  loadStaticInfo().catch((e) =>
    console.error("static info load failed:", e.message)
  );
});
