"use client";

import { motion } from "framer-motion";
import type { PersonalRecords } from "@/hooks/useAdvancedStats";
import { useTranslation } from "@/hooks/useTranslation";
import { CATEGORY_ICONS } from "@/lib/categories";

interface PersonalRecordsProps {
  records: PersonalRecords;
}

interface RecordCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  index: number;
}

function RecordCard({ icon, label, value, sub, index }: RecordCardProps) {
  return (
    <motion.div
      className="card-elevated p-3 flex items-center gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.25 }}
    >
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted leading-tight truncate">{label}</p>
        <p className="text-base font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted">{sub}</p>}
      </div>
    </motion.div>
  );
}

export function PersonalRecordsSection({ records }: PersonalRecordsProps) {
  const { t } = useTranslation();

  const formatDate = (iso: string | null): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} דק׳`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}ש׳ ${m}ד׳` : `${h} שעות`;
  };

  const favIcon = records.favoriteCategoryKey
    ? (CATEGORY_ICONS[records.favoriteCategoryKey] ?? "🏠")
    : "🏠";

  const cards = [
    {
      icon: "📅",
      label: t("stats.records.mostProductiveDay"),
      value: formatDate(records.mostProductiveDate),
      sub: records.mostProductiveDate
        ? `${records.mostProductiveCount} ${t("stats.records.tasksOnDay")}`
        : undefined,
    },
    {
      icon: "🔥",
      label: t("stats.records.longestStreak"),
      value: `${records.longestStreak} ${t("stats.records.days")}`,
      sub: undefined,
    },
    {
      icon: favIcon,
      label: t("stats.records.favoriteCategory"),
      value: records.favoriteCategoryLabel ?? "—",
      sub: undefined,
    },
    {
      icon: "⏱️",
      label: t("stats.records.timeSaved"),
      value: formatTime(records.totalTimeSavedMinutes),
      sub: `${records.totalCompletions} ${t("stats.records.totalCompletions")}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card, i) => (
        <RecordCard
          key={card.label}
          icon={card.icon}
          label={card.label}
          value={card.value}
          sub={card.sub}
          index={i}
        />
      ))}
    </div>
  );
}
