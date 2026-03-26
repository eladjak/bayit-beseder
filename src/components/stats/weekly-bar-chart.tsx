"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface WeeklyDataPoint {
  day: string;
  completed: number;
  total: number;
}

interface WeeklyBarChartProps {
  data: WeeklyDataPoint[];
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  return (
    <div className="h-48" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="day"
            fontSize={12}
            tick={{ fill: "var(--color-muted)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            fontSize={12}
            allowDecimals={false}
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
            formatter={(value) => [`${value} משימות`, "הושלמו"]}
            labelFormatter={(label) => `יום ${label}`}
          />
          <Bar
            dataKey="completed"
            fill="#6366F1"
            radius={[4, 4, 0, 0]}
            name="הושלמו"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
