"use client";

import { motion } from "framer-motion";
import type { EnergyLevel } from "@/lib/energy-filter";
import { getEnergyLabel, getEnergyEmoji } from "@/lib/energy-filter";

interface EnergyModeToggleProps {
  energyLevel: EnergyLevel;
  onToggle: () => void;
}

const LEVEL_COLORS: Record<EnergyLevel, { bg: string; text: string }> = {
  all: { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-400" },
  moderate: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-400" },
  light: { bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-400" },
};

export function EnergyModeToggle({ energyLevel, onToggle }: EnergyModeToggleProps) {
  const colors = LEVEL_COLORS[energyLevel];

  return (
    <motion.button
      onClick={onToggle}
      className={`rounded-full py-1.5 px-3 text-xs font-medium ${colors.bg} ${colors.text}`}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      layout
    >
      <motion.span
        key={energyLevel}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {getEnergyEmoji(energyLevel)} {getEnergyLabel(energyLevel)}
      </motion.span>
    </motion.button>
  );
}
