"use client";

import { motion } from "framer-motion";
import { Lightbulb, ChevronDown, ChevronUp, ArrowLeftRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { Suggestion } from "@/lib/smart-scheduler";

interface WeeklySmartSuggestionsProps {
  suggestions: Suggestion[];
  isRealData: boolean;
  showSuggestions: boolean;
  onToggle: () => void;
  onApplySuggestion: (suggestion: Suggestion) => void;
}

export function WeeklySmartSuggestions({
  suggestions,
  isRealData,
  showSuggestions,
  onToggle,
  onApplySuggestion,
}: WeeklySmartSuggestionsProps) {
  const { t } = useTranslation();

  if (suggestions.length === 0) return null;

  return (
    <div className="card-elevated bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-100/50 dark:border-purple-800/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-right">
            <div className="font-semibold text-foreground">
              {t("weekly.smartSuggestionsTitle")}
            </div>
            <div className="text-xs text-muted">
              {suggestions.length} {t("weekly.suggestionsCount")}
            </div>
          </div>
        </div>
        {showSuggestions ? (
          <ChevronUp className="w-5 h-5 text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted" />
        )}
      </button>

      {showSuggestions && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4 space-y-2"
        >
          {suggestions.map((suggestion: Suggestion, idx: number) => {
            const isActionable =
              (suggestion.type === "heavy_day" ||
                suggestion.type === "empty_day" ||
                suggestion.type === "busy_calendar_day") &&
              suggestion.affectedDates &&
              suggestion.affectedDates.length >= 2;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-3 rounded-xl bg-white/60 dark:bg-surface/80 backdrop-blur-sm border ${
                  suggestion.priority === "high"
                    ? "border-red-200 dark:border-red-800/50"
                    : suggestion.priority === "medium"
                      ? "border-amber-200 dark:border-amber-800/50"
                      : "border-slate-200 dark:border-slate-700/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      suggestion.priority === "high"
                        ? "bg-red-500"
                        : suggestion.priority === "medium"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground">
                      {suggestion.title}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {suggestion.description}
                    </div>
                    {isActionable && isRealData && (
                      <button
                        onClick={() => onApplySuggestion(suggestion)}
                        className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors active:scale-95"
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        {t("weekly.moveTask")}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
