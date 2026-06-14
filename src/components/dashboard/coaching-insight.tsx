"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COACHING_STYLE_EMOJIS } from "@/lib/coaching-messages-adaptive";
import type { CoachingStyle } from "@/lib/coaching-tracker";
import { useTranslation } from "@/hooks/useTranslation";

// ============================================================
// Types
// ============================================================

interface StyleSummaryItem {
  coaching_style: CoachingStyle;
  total_sent: number;
  completions_within_2h: number;
  effectiveness_rate: number;
}

interface CoachingInsightsData {
  hasData: boolean;
  bestStyle: CoachingStyle;
  summary: StyleSummaryItem[];
  totalSent: number;
}

// ============================================================
// Mini bar chart
// ============================================================

const STYLE_ORDER: CoachingStyle[] = [
  "encouraging",
  "factual",
  "playful",
  "urgent",
];

const STYLE_COLORS: Record<CoachingStyle, string> = {
  encouraging: "bg-green-400",
  factual: "bg-blue-400",
  playful: "bg-purple-400",
  urgent: "bg-orange-400",
};

interface MiniBarProps {
  summary: StyleSummaryItem[];
  bestStyle: CoachingStyle;
  t: (key: string) => string;
}

function MiniBar({ summary, bestStyle, t }: MiniBarProps) {
  const byStyle = new Map<CoachingStyle, number>(
    summary.map((s) => [s.coaching_style, s.effectiveness_rate])
  );

  const maxRate = Math.max(...Array.from(byStyle.values()), 0.01);

  return (
    <div className="flex items-end gap-2 h-12 mt-3" role="img" aria-label={t("coaching.insight.chartLabel")}>
      {STYLE_ORDER.map((style) => {
        const rate = byStyle.get(style) ?? 0;
        const heightPct = Math.round((rate / maxRate) * 100);
        const isBest = style === bestStyle;
        const label = t(`coaching.insight.styles.${style}`);
        const emoji = COACHING_STYLE_EMOJIS[style];
        const pct = Math.round(rate * 100);

        return (
          <div key={style} className="flex flex-col items-center flex-1 gap-1">
            <span className="text-[9px] text-muted leading-none">{pct}%</span>
            <motion.div
              className={`w-full rounded-t-sm transition-all ${STYLE_COLORS[style]} ${isBest ? "ring-2 ring-offset-1 ring-primary" : "opacity-70"}`}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: STYLE_ORDER.indexOf(style) * 0.08 }}
              style={{ height: `${Math.max(heightPct, 4)}%`, minHeight: 4, transformOrigin: "bottom" }}
              title={`${label}: ${pct}%`}
            />
            <span className="text-[9px] text-muted leading-none" aria-hidden>
              {emoji}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function CoachingInsight() {
  const { t, locale } = useTranslation();
  const dir = locale === "he" ? "rtl" : "ltr";
  const [data, setData] = useState<CoachingInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/coaching/insights")
      .then((r) => r.json())
      .then((json: CoachingInsightsData) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Show skeleton while loading
  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm animate-pulse" dir={dir}>
        <div className="h-4 w-32 bg-border/50 rounded mb-3" />
        <div className="h-20 bg-border/30 rounded" />
      </div>
    );
  }

  // Onboarding card when there's no coaching data yet (cold start)
  if (!data || !data.hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border p-4 shadow-sm"
        dir={dir}
        aria-label={t("coaching.insight.systemLabel")}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🧠</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{t("coaching.insight.smartTitle")}</p>
            <p className="text-xs text-muted">{t("coaching.insight.smartSubtitle")}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {STYLE_ORDER.map((style) => (
            <div
              key={style}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-surface"
            >
              <span className="text-lg">{COACHING_STYLE_EMOJIS[style]}</span>
              <span className="text-[10px] text-muted text-center leading-tight">
                {t(`coaching.insight.styles.${style}`)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted mt-3 text-center">
          {t("coaching.insight.coldStartHint")}
        </p>
      </motion.div>
    );
  }

  const bestLabel = t(`coaching.insight.styles.${data.bestStyle}`);
  const bestEmoji = COACHING_STYLE_EMOJIS[data.bestStyle];
  const bestSummary = data.summary.find((s) => s.coaching_style === data.bestStyle);
  const bestPct = bestSummary
    ? Math.round(bestSummary.effectiveness_rate * 100)
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl bg-card border border-border p-4 shadow-sm"
        dir={dir}
        aria-label={t("coaching.insight.insightsLabel")}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">
            {t("coaching.insight.styleHeader")}
          </span>
          <span className="text-[10px] text-muted">{t("coaching.insight.last30Days")}</span>
        </div>

        {/* Current best style pill */}
        <div className="flex items-center gap-2">
          <span className="text-xl">{bestEmoji}</span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {bestLabel}
            </p>
            <p className="text-xs text-muted">
              {t("coaching.insight.effectivenessMessages")
                .replace("{pct}", String(bestPct))
                .replace("{sent}", String(data.totalSent))}
            </p>
          </div>
        </div>

        {/* Bar chart */}
        {data.summary.length > 0 && (
          <MiniBar summary={data.summary} bestStyle={data.bestStyle} t={t} />
        )}

        {/* Style legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {STYLE_ORDER.map((style) => {
            const item = data.summary.find((s) => s.coaching_style === style);
            if (!item) return null;
            return (
              <span
                key={style}
                className={`text-[10px] ${style === data.bestStyle ? "text-foreground font-semibold" : "text-muted"}`}
              >
                {COACHING_STYLE_EMOJIS[style]} {t(`coaching.insight.styles.${style}`)}
              </span>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
