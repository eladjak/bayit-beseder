"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyTrendPoint } from "@/hooks/useAdvancedStats";

interface WeeklyTrendChartProps {
  data: WeeklyTrendPoint[];
  myName: string;
  avgLabel: string;
}

export function WeeklyTrendChart({ data, myName, avgLabel }: WeeklyTrendChartProps) {
  return (
    <div className="h-52" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="week"
            fontSize={11}
            tick={{ fill: "var(--color-muted)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            fontSize={11}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "var(--color-muted)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-foreground)",
              fontSize: 12,
              direction: "rtl",
            }}
            formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0}%`, name ?? ""]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, direction: "rtl" }}
            formatter={(value) => value}
          />
          <Line
            type="monotone"
            dataKey="myPct"
            name={myName}
            stroke="#6366F1"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#6366F1" }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="avgPct"
            name={avgLabel}
            stroke="#A78BFA"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3, fill: "#A78BFA" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
