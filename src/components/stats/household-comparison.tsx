"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { Users, Scale, TrendingUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface MemberStats {
  id: string;
  name: string;
  completedThisWeek: number;
  totalThisWeek: number;
  goldenRuleScore: number; // 0-100, 50 = perfectly balanced
  last4Weeks: number[]; // completion pct per week
}

interface HouseholdComparisonProps {
  members: MemberStats[];
}

const RANK_COLORS = [
  "var(--color-primary)",
  "var(--color-accent, #f59e0b)",
  "var(--color-muted)",
];

const SPARKLINE_WIDTH = 60;
const SPARKLINE_HEIGHT = 20;

function MiniSparkline({ data, label }: { data: number[]; label: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * SPARKLINE_WIDTH;
      const y = SPARKLINE_HEIGHT - (v / max) * SPARKLINE_HEIGHT;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      aria-label={label}
      role="img"
      className="inline-block"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HouseholdComparison({ members }: HouseholdComparisonProps) {
  const { t } = useTranslation();

  const barData = useMemo(() => {
    return members
      .map((m) => ({
        name: m.name,
        pct:
          m.totalThisWeek > 0
            ? Math.round((m.completedThisWeek / m.totalThisWeek) * 100)
            : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [members]);

  const goldenRuleBalanced = useMemo(() => {
    if (members.length < 2) return true;
    const scores = members.map((m) => m.goldenRuleScore);
    const diff = Math.abs(scores[0] - scores[1]);
    return diff < 20; // within 20 points = balanced
  }, [members]);

  if (members.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-surface rounded-2xl p-4 shadow-sm border border-border"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("stats.comparison.title")}
        </h3>
      </div>

      {/* Weekly completion bar chart */}
      <div className="mb-4">
        <p className="text-xs text-muted mb-2">
          {t("stats.comparison.weeklyPct")}
        </p>
        <div className="h-32" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 8 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={60}
                tick={{ fontSize: 11, fill: "var(--color-foreground)" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-foreground)",
                  fontSize: 11,
                  direction: "rtl",
                }}
                formatter={(value: number | undefined) =>
                  [`${value ?? 0}%`, t("stats.comparison.completionPct")] as [string, string]
                }
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={RANK_COLORS[i % RANK_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Golden rule balance */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Scale className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs text-muted">
          {t("stats.comparison.goldenRuleBalance")}:
        </span>
        <span
          className={`text-xs font-medium ${
            goldenRuleBalanced ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {goldenRuleBalanced
            ? t("stats.comparison.balanced")
            : t("stats.comparison.imbalanced")}
        </span>
      </div>

      {/* Sparklines per member */}
      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between px-1"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-muted" />
              <span className="text-xs text-foreground">{m.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MiniSparkline
                data={m.last4Weeks}
                label={`${m.name} - ${t("stats.comparison.sparklineLabel")}`}
              />
              <span className="text-[10px] text-muted w-8 text-left">
                {m.last4Weeks.length > 0
                  ? `${m.last4Weeks[m.last4Weeks.length - 1]}%`
                  : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
