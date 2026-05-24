"use client";

/**
 * Fairness Balance Meter — Sprint 7.31 (council recommendation #1, the "painkiller").
 * A warm, non-competitive view of how the household load split this week.
 * Renders nothing when not meaningful (solo / <2 members / no completions this week).
 */

import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { computeFairnessBalance } from "@/lib/fairness-balance";
import type { TaskCompletionRow } from "@/lib/types/database";

const BAR_COLORS = ["bg-primary", "bg-violet-400", "bg-amber-400", "bg-emerald-400", "bg-rose-400", "bg-sky-400"];
const DOT_COLORS = ["bg-primary", "bg-violet-400", "bg-amber-400", "bg-emerald-400", "bg-rose-400", "bg-sky-400"];

interface FairnessBalanceMeterProps {
  completions: TaskCompletionRow[];
  members: Array<{ id: string; name: string }>;
  today: string;
}

export function FairnessBalanceMeter({ completions, members, today }: FairnessBalanceMeterProps) {
  const balance = computeFairnessBalance(completions, members, today);
  if (!balance.show) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bb-card p-4"
      aria-label="מאזן ההוגנות של השבוע"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="inline-flex items-center justify-center size-7 rounded-xl bg-primary/10 text-primary">
          <Scale className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground">מאזן השבוע</h3>
          <p className="text-[11px] text-muted">איך התחלק העומס בבית — 7 ימים אחרונים</p>
        </div>
      </div>

      {/* Segmented balance bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-hover" role="img"
        aria-label={balance.shares.map((s) => `${s.name} ${s.pct} אחוז`).join(", ")}>
        {balance.shares.map((s, i) =>
          s.pct > 0 ? (
            <div
              key={s.userId}
              className={`${BAR_COLORS[i % BAR_COLORS.length]} h-full transition-[width] duration-500`}
              style={{ width: `${s.pct}%` }}
            />
          ) : null
        )}
      </div>

      {/* Per-member legend */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {balance.shares.map((s, i) => (
          <div key={s.userId} className="flex items-center gap-1.5 text-xs">
            <span className={`size-2 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]}`} aria-hidden="true" />
            <span className="text-foreground font-medium">{s.name}</span>
            <span className="text-muted tabular-nums">{s.pct}%</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground leading-relaxed text-pretty">{balance.headline}</p>
    </motion.section>
  );
}
