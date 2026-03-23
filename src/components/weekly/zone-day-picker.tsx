"use client";

import { motion } from "framer-motion";
import { getZoneInfo, ZONE_DAY_LABELS, type ZoneDayMapping } from "@/lib/zones";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/categories";

// ============================================
// Types
// ============================================

export interface ZoneDayPickerProps {
  mappings: ZoneDayMapping[];
  onChange: (mappings: ZoneDayMapping[]) => void;
}

// Days shown in the picker (Sun–Thu, Israeli work week)
const PICKER_DAYS = [0, 1, 2, 3, 4] as const;
type PickerDay = (typeof PICKER_DAYS)[number];

// Short day labels for the button row
const DAY_SHORT_LABELS: Record<PickerDay, string> = {
  0: "ראשון",
  1: "שני",
  2: "שלישי",
  3: "רביעי",
  4: "חמישי",
};

// Tailwind ring/bg colours that echo the hex category colours without dynamic class generation
const ZONE_RING_CLASSES: Record<CategoryKey, string> = {
  kitchen: "ring-amber-400 bg-amber-50 dark:bg-amber-950/30",
  bathroom: "ring-blue-400 bg-blue-50 dark:bg-blue-950/30",
  living: "ring-purple-400 bg-purple-50 dark:bg-purple-950/30",
  bedroom: "ring-pink-400 bg-pink-50 dark:bg-pink-950/30",
  laundry: "ring-cyan-400 bg-cyan-50 dark:bg-cyan-950/30",
  outdoor: "ring-lime-400 bg-lime-50 dark:bg-lime-950/30",
  pets: "ring-orange-400 bg-orange-50 dark:bg-orange-950/30",
  general: "ring-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
};

const ZONE_SELECTED_DAY_CLASSES: Record<CategoryKey, string> = {
  kitchen: "bg-amber-500 text-white",
  bathroom: "bg-blue-500 text-white",
  living: "bg-purple-500 text-white",
  bedroom: "bg-pink-500 text-white",
  laundry: "bg-cyan-500 text-white",
  outdoor: "bg-lime-500 text-white",
  pets: "bg-orange-500 text-white",
  general: "bg-emerald-500 text-white",
};

// ============================================
// Helpers
// ============================================

/** Return the preferred day for a zone (first assigned day, or -1 if none). */
function getPreferredDayForZone(
  zone: CategoryKey,
  mappings: ZoneDayMapping[]
): number {
  const m = mappings.find((x) => x.zone === zone);
  return m?.preferredDays[0] ?? -1;
}

/** Update mappings for one zone — replaces its preferredDays with [day]. */
function setZoneDay(
  zone: CategoryKey,
  day: number,
  mappings: ZoneDayMapping[]
): ZoneDayMapping[] {
  const existing = mappings.find((m) => m.zone === zone);
  if (existing) {
    return mappings.map((m) =>
      m.zone === zone ? { ...m, preferredDays: [day] } : m
    );
  }
  return [...mappings, { zone, preferredDays: [day] }];
}

// ============================================
// Sub-component: single zone row
// ============================================

interface ZoneRowProps {
  zone: CategoryKey;
  currentDay: number;
  onSelectDay: (day: PickerDay) => void;
}

function ZoneRow({ zone, currentDay, onSelectDay }: ZoneRowProps) {
  const info = getZoneInfo(zone);
  const ringBg = ZONE_RING_CLASSES[zone];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${ringBg} transition-colors`}
    >
      {/* Zone pill */}
      <div className="flex shrink-0 items-center gap-1.5 w-28">
        <span className="text-xl leading-none">{info.icon}</span>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {info.label}
        </span>
      </div>

      {/* Day selector buttons */}
      <div className="flex flex-1 justify-between gap-1" role="group" aria-label={`יום עבור ${info.label}`}>
        {PICKER_DAYS.map((day) => {
          const isSelected = currentDay === day;
          const selectedCls = isSelected ? ZONE_SELECTED_DAY_CLASSES[zone] : "";
          return (
            <motion.button
              key={day}
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => onSelectDay(day)}
              aria-pressed={isSelected}
              aria-label={`${ZONE_DAY_LABELS[day]} עבור ${info.label}`}
              className={[
                "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                isSelected
                  ? selectedCls
                  : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700",
              ].join(" ")}
            >
              {DAY_SHORT_LABELS[day]}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================
// Main component
// ============================================

export function ZoneDayPicker({ mappings, onChange }: ZoneDayPickerProps) {
  function handleSelectDay(zone: CategoryKey, day: PickerDay) {
    const updated = setZoneDay(zone, day, mappings);
    onChange(updated);
  }

  return (
    <div className="card-elevated p-4" dir="rtl">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          הגדרת זונות לימים
        </h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          בחר באיזה יום כל אזור בבית יטופל
        </p>
      </div>

      {/* Zone rows */}
      <div className="flex flex-col gap-2">
        {CATEGORY_KEYS.map((zone) => (
          <ZoneRow
            key={zone}
            zone={zone}
            currentDay={getPreferredDayForZone(zone, mappings)}
            onSelectDay={(day) => handleSelectDay(zone, day)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {PICKER_DAYS.map((day) => (
          <span key={day} className="text-xs text-gray-400 dark:text-gray-500">
            {DAY_SHORT_LABELS[day]} = {ZONE_DAY_LABELS[day]}
          </span>
        ))}
      </div>
    </div>
  );
}
