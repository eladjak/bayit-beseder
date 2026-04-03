"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ZoneDayPicker } from "@/components/weekly/zone-day-picker";
import type { ZoneDayMapping } from "@/lib/zones";

interface WeeklyZonePanelProps {
  show: boolean;
  onClose: () => void;
  mappings: ZoneDayMapping[];
  onMoveZone: (zone: string, day: number) => void;
}

export function WeeklyZonePanel({
  show,
  onClose,
  mappings,
  onMoveZone,
}: WeeklyZonePanelProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="zone-picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-4"
          onClick={onClose}
        >
          <motion.div
            key="zone-picker-card"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {t("weekly.zoneDayPickerTitle")}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t("weekly.close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 pb-4">
              <ZoneDayPicker
                mappings={mappings}
                onChange={(updated) => {
                  updated.forEach((m) => {
                    if (m.preferredDays[0] !== undefined) {
                      onMoveZone(m.zone, m.preferredDays[0]);
                    }
                  });
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
