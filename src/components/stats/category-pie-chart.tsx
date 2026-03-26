"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { getCategoryColor, getCategoryLabel } from "@/lib/seed-data";

interface CategoryDataPoint {
  name: string;
  value: number;
  category: string;
}

interface CategoryPieChartProps {
  data: CategoryDataPoint[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-36 h-36" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={getCategoryColor(entry.category)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5">
        {data.map((entry) => (
          <div
            key={entry.category}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: getCategoryColor(entry.category) }}
            />
            <span className="text-foreground">
              {getCategoryLabel(entry.category)}
            </span>
            <span className="text-muted ms-auto">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
