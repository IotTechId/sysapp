import React from "react";
import {
  AreaChart,
  Area,
  YAxis,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatTime } from "../format";

// Realtime area chart for a single (or dual) series.
export default function Sparkline({
  data,
  series,
  unit = "",
  domain = [0, 100],
  height = 200,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={formatTime}
          tick={{ fill: "var(--text-dim)", fontSize: 10 }}
          minTickGap={40}
          stroke="var(--border)"
        />
        <YAxis
          domain={domain}
          tick={{ fill: "var(--text-dim)", fontSize: 10 }}
          stroke="var(--border)"
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={formatTime}
          formatter={(v, name) => [`${v}${unit}`, name]}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            isAnimationActive={false}
            connectNulls
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
