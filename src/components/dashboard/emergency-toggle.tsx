"use client";

import { memo } from "react";
import { AlertTriangle, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

interface EmergencyToggleProps {
  active: boolean;
  onToggle: () => void;
}

export const EmergencyToggle = memo(function EmergencyToggle({ active, onToggle }: EmergencyToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      {active && (
        <motion.div
          className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            🫂 {t("emergency.activeTitle")} - {t("emergency.focusEssentials")}
          </p>
        </motion.div>
      )}
      <button
        onClick={onToggle}
        className={`w-full rounded-xl p-3 flex items-center justify-center gap-2 font-medium transition-colors ${
          active
            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60"
            : "bg-surface text-muted hover:bg-surface-hover border border-border"
        }`}
      >
        {active ? (
          <>
            <Shield className="w-5 h-5" />
            {t("emergency.deactivateButton")}
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5" />
            {t("emergency.activateButton")}
          </>
        )}
      </button>
    </div>
  );
});
