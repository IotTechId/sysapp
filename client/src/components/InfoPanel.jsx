import React from "react";
import { formatBytes, formatUptime } from "../format";

export default function InfoPanel({ info, uptime }) {
  if (!info) return <p className="muted">Loading system info…</p>;
  const rows = [
    ["Hostname", info.hostname],
    ["Public IPv4", info.publicIp || "resolving…"],
    ["Private IPv4", info.privateIp || "—"],
    ["Location", info.location || "resolving…"],
    ["OS", info.os],
    ["Kernel", info.kernel],
    ["Arch", info.arch],
    ["CPU", info.cpuBrand],
    ["Cores", `${info.cpuPhysicalCores} physical / ${info.cpuCores} logical`],
    ["Base clock", info.cpuSpeed ? `${info.cpuSpeed} GHz` : "—"],
    ["Total RAM", formatBytes(info.totalMem)],
    ["Network iface", info.iface || "—"],
    ["MAC", info.mac || "—"],
    ["Machine", `${info.manufacturer || ""} ${info.model || ""}`.trim() || "—"],
    ["Timezone", info.timezone],
    ["Uptime", formatUptime(uptime)],
  ];
  return (
    <dl className="info-grid">
      {rows.map(([k, v]) => (
        <div className="info-item" key={k}>
          <dt>{k}</dt>
          <dd>{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
