import React from "react";
import { formatBytes } from "../format";

export default function DiskList({ disks = [] }) {
  if (!disks.length) return <p className="muted">No disk data</p>;
  return (
    <div className="disk-list">
      {disks.map((d) => {
        const pct = d.usePercent ?? 0;
        let color = "var(--accent)";
        if (pct >= 90) color = "var(--crit)";
        else if (pct >= 75) color = "var(--warn)";
        return (
          <div className="disk-row" key={d.fs + d.mount}>
            <div className="disk-meta">
              <span className="disk-mount">{d.mount}</span>
              <span className="disk-fs">{d.type}</span>
            </div>
            <div className="disk-bar">
              <div className="disk-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="disk-figures">
              <span>
                {formatBytes(d.used)} / {formatBytes(d.size)}
              </span>
              <span style={{ color }}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
