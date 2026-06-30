import React from "react";

// Circular gauge for a single percentage / value.
export default function Gauge({ value, label, unit = "%", max = 100, warn = 70, crit = 90 }) {
  const pct = value == null ? 0 : Math.min((value / max) * 100, 100);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  let color = "var(--accent)";
  if (value != null) {
    if (value >= crit) color = "var(--crit)";
    else if (value >= warn) color = "var(--warn)";
  }

  return (
    <div className="gauge">
      <svg viewBox="0 0 140 140" className="gauge-svg">
        <circle cx="70" cy="70" r={radius} className="gauge-track" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          className="gauge-value"
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-num" style={{ color }}>
          {value == null ? "—" : value}
          <small>{value == null ? "" : unit}</small>
        </span>
        <span className="gauge-label">{label}</span>
      </div>
    </div>
  );
}
