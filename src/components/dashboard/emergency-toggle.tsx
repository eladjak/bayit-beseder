"use client";

import { AlertTriangle, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface EmergencyToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function EmergencyToggle({ active, onToggle }: EmergencyToggleProps) {
  return (
    <div className="space-y-2">
      {active && (
        <motion.div
          className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            🫂 מצב חירום פעיל - מתמקדים רק בחשוב
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
            כיבוי מצב חירום
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5" />
            הפעלת מצב חירום
          </>
        )}
      </button>
    </div>
  );
}
