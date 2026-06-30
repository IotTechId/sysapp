import React from "react";
import { useServerData } from "./useServerData";
import Card from "./components/Card";
import Gauge from "./components/Gauge";
import Sparkline from "./components/Sparkline";
import DiskList from "./components/DiskList";
import InfoPanel from "./components/InfoPanel";
import { formatSpeed, formatBytes, formatUptime } from "./format";

export default function App() {
  const { info, metrics, history, status } = useServerData();

  const m = metrics;
  const temp = m?.temperature?.main;

  // Disk utama: pakai mount "/" kalau ada, kalau tidak ambil yang terbesar
  const primaryDisk =
    m?.disks?.find((d) => d.mount === "/") ||
    m?.disks?.slice().sort((a, b) => b.size - a.size)[0] ||
    null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◉</span>
          <div>
            <h1>{info?.hostname || "sysapp"}</h1>
            <p>Homeserver Monitor</p>
          </div>
        </div>
        <div className="topbar-right">
          <div className={`status status-${status}`}>
            <span className="dot" />
            {status === "online" ? "Live" : status === "connecting" ? "Connecting…" : "Reconnecting…"}
          </div>
          <div className="uptime">
            Uptime <strong>{formatUptime(m?.uptime)}</strong>
          </div>
        </div>
      </header>

      {/* System info — top */}
      <Card title="System Info" className="info-top">
        <InfoPanel info={info} uptime={m?.uptime} />
      </Card>

      {/* Gauges row */}
      <div className="gauges-row">
        <Card title="CPU Load">
          <Gauge value={m?.cpu?.load} label="usage" warn={70} crit={90} />
        </Card>
        <Card title="Memory">
          <Gauge value={m?.memory?.usedPercent} label="used" warn={75} crit={90} />
        </Card>
        <Card title="Temperature">
          <Gauge
            value={temp}
            unit="°C"
            max={100}
            label={temp == null ? "no sensor" : "package"}
            warn={65}
            crit={80}
          />
        </Card>
        <Card title="Disk Usage">
          <Gauge
            value={primaryDisk?.usePercent}
            label="used"
            warn={75}
            crit={90}
          />
        </Card>
        <Card title="Network" className="net-card">
          <div className="net-figures">
            <div className="net-stat down">
              <span className="net-label">↓ Download</span>
              <span className="net-val">{formatSpeed(m?.network?.rxSec)}</span>
            </div>
            <div className="net-stat up">
              <span className="net-label">↑ Upload</span>
              <span className="net-val">{formatSpeed(m?.network?.txSec)}</span>
            </div>
            <div className="net-iface">
              iface: {m?.network?.iface || "—"} · total ↓{formatBytes(m?.network?.rxTotal)} ↑
              {formatBytes(m?.network?.txTotal)}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts grid */}
      <div className="charts-grid">
        <Card
          title="CPU Usage"
          subtitle="last 2 minutes"
          right={<Badge value={m?.cpu?.load} unit="%" />}
        >
          <Sparkline
            data={history}
            domain={[0, 100]}
            unit="%"
            series={[{ key: "cpu", name: "CPU", color: "#5b9dff" }]}
          />
        </Card>

        <Card
          title="Memory Usage"
          subtitle={m ? `${formatBytes(m.memory.used)} / ${formatBytes(m.memory.total)}` : ""}
          right={<Badge value={m?.memory?.usedPercent} unit="%" />}
        >
          <Sparkline
            data={history}
            domain={[0, 100]}
            unit="%"
            series={[{ key: "mem", name: "RAM", color: "#a06bff" }]}
          />
        </Card>

        <Card
          title="Temperature"
          subtitle="CPU package"
          right={<Badge value={temp} unit="°C" />}
        >
          {temp == null ? (
            <div className="no-sensor">
              <p>🌡️ No temperature sensor detected</p>
              <small>
                Akan otomatis terbaca di homeserver dengan sensor (lm-sensors / thermal zone).
              </small>
            </div>
          ) : (
            <Sparkline
              data={history}
              domain={[20, 100]}
              unit="°C"
              series={[{ key: "temp", name: "Temp", color: "#ff7a59" }]}
            />
          )}
        </Card>

        <Card title="Network Throughput" subtitle="Mbps">
          <Sparkline
            data={history}
            domain={[0, "auto"]}
            unit=" Mbps"
            series={[
              { key: "rx", name: "Down", color: "#3ddc97" },
              { key: "tx", name: "Up", color: "#ffb454" },
            ]}
          />
        </Card>
      </div>

      {/* Bottom: disks, per-core, info */}
      <div className="bottom-grid">
        <Card title="Storage" subtitle="mounted filesystems">
          <DiskList disks={m?.disks} />
        </Card>

        <Card title="CPU Cores" subtitle={`${m?.cpu?.perCore?.length || 0} logical cores`}>
          <CoreGrid cores={m?.cpu?.perCore} />
        </Card>
      </div>

      <footer className="footer">
        sysapp · realtime monitor · {m ? new Date(m.timestamp).toLocaleString() : "—"}
        {m?.processes?.all != null && (
          <span> · {m.processes.running} running / {m.processes.all} processes</span>
        )}
      </footer>
    </div>
  );
}

function Badge({ value, unit }) {
  if (value == null) return <span className="badge">—</span>;
  let cls = "ok";
  if (value >= 90) cls = "crit";
  else if (value >= 70) cls = "warn";
  return (
    <span className={`badge ${cls}`}>
      {value}
      {unit}
    </span>
  );
}

function CoreGrid({ cores = [] }) {
  if (!cores.length) return <p className="muted">No per-core data</p>;
  const r = 26;
  const circ = 2 * Math.PI * r;
  return (
    <div className="core-grid">
      {cores.map((load, i) => {
        let color = "var(--accent)";
        if (load >= 90) color = "var(--crit)";
        else if (load >= 70) color = "var(--warn)";
        const offset = circ - (Math.min(load, 100) / 100) * circ;
        return (
          <div className="core" key={i}>
            <div className="core-ring">
              <svg viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={r} className="core-ring-track" />
                <circle
                  cx="32"
                  cy="32"
                  r={r}
                  className="core-ring-value"
                  stroke={color}
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                />
              </svg>
              <span className="core-val" style={{ color }}>
                {Math.round(load)}
                <small>%</small>
              </span>
            </div>
            <span className="core-label">Core {i}</span>
          </div>
        );
      })}
    </div>
  );
}
