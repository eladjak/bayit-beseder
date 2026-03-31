"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import type { CleaningLevel } from "@/lib/room-task-templates";

interface StepCleaningLevelProps {
  selected: CleaningLevel;
  onSelect: (level: CleaningLevel) => void;
}

const LEVELS: Array<{
  value: CleaningLevel;
  emoji: string;
  color: string;
  bgColor: string;
}> = [
  { value: "basic", emoji: "🧹", color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" },
  { value: "thorough", emoji: "✨", color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  { value: "deep", emoji: "💎", color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
];

export function StepCleaningLevel({ selected, onSelect }: StepCleaningLevelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏠</div>
        <h2 className="text-xl font-bold text-foreground">
          {t("setupWizard.stepLevel")}
        </h2>
        <p className="text-sm text-muted mt-1">
          {t("setupWizard.subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        {LEVELS.map((level, index) => {
          const isSelected = selected === level.value;
          const titleKey = `setupWizard.level${level.value.charAt(0).toUpperCase() + level.value.slice(1)}` as const;
          const descKey = `${titleKey}Desc` as const;

          return (
            <motion.button
              key={level.value}
              onClick={() => onSelect(level.value)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
              className={[
                "w-full p-5 rounded-2xl border-2 text-right transition-all",
                isSelected
                  ? `${level.bgColor} border-primary shadow-lg`
                  : "bg-surface border-border hover:border-primary/30",
              ].join(" ")}
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl flex-shrink-0">{level.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-bold ${isSelected ? level.color : "text-foreground"}`}>
                      {t(titleKey)}
                    </span>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-primary"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </motion.span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{t(descKey)}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
