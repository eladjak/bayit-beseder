/**
 * Zone-based scheduling — organizes weekly tasks by house zones (rooms/areas).
 * Zones map 1:1 to the existing category system.
 */

import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS, type CategoryKey } from "./categories";

// ============================================
// Types
// ============================================

export interface ZoneDayMapping {
  /** Category key (e.g., "kitchen") = zone */
  zone: CategoryKey;
  /** Preferred day indices (0=Sun ... 4=Thu). Multiple zones can share a day. */
  preferredDays: number[];
}

export interface ZoneGroup {
  zone: CategoryKey;
  label: string;
  icon: string;
  color: string;
  tasks: Array<{
    title: string;
    assignee: string | null;
    estimated_minutes: number;
    completed: boolean;
    taskId?: string;
  }>;
  totalMinutes: number;
}

// ============================================
// Default zone-to-day mappings
// ============================================

/**
 * Default zone assignments for a typical Israeli household:
 * - Sunday: Kitchen + Bathroom (high-traffic, needs weekly attention)
 * - Monday: Living room + Bedroom (living spaces)
 * - Tuesday: Laundry + Outdoor (utility)
 * - Wednesday: General + Pets (misc)
 * - Thursday: Overflow / rotating
 * - Friday: Light tasks only (Erev Shabbat)
 * - Saturday: Shabbat (no tasks)
 */
export const DEFAULT_ZONE_MAPPINGS: ZoneDayMapping[] = [
  { zone: "kitchen", preferredDays: [0] },    // Sunday
  { zone: "bathroom", preferredDays: [0] },   // Sunday
  { zone: "living", preferredDays: [1] },     // Monday
  { zone: "bedroom", preferredDays: [1] },    // Monday
  { zone: "laundry", preferredDays: [2] },    // Tuesday
  { zone: "outdoor", preferredDays: [2] },    // Tuesday
  { zone: "general", preferredDays: [3] },    // Wednesday
  { zone: "pets", preferredDays: [3] },       // Wednesday
];

export const ZONE_DAY_LABELS: Record<number, string> = {
  0: "יום ראשון",
  1: "יום שני",
  2: "יום שלישי",
  3: "יום רביעי",
  4: "יום חמישי",
  5: "יום שישי",
  6: "שבת",
};

// ============================================
// Helpers
// ============================================

/**
 * Get zone info (label, icon, color) for a category key.
 */
export function getZoneInfo(zone: CategoryKey) {
  return {
    zone,
    label: CATEGORY_LABELS[zone] ?? zone,
    icon: CATEGORY_ICONS[zone] ?? "🏠",
    color: CATEGORY_COLORS[zone] ?? "#6B7280",
  };
}

/**
 * Build a summary of which zones are assigned to each day.
 * Returns an array of 7 entries (Sun-Sat), each with the zones for that day.
 */
export function buildZoneDaySummary(
  mappings: ZoneDayMapping[] = DEFAULT_ZONE_MAPPINGS
): Array<{ dayIndex: number; dayName: string; zones: Array<{ zone: CategoryKey; icon: string; label: string }> }> {
  const summary = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    dayName: ZONE_DAY_LABELS[i],
    zones: [] as Array<{ zone: CategoryKey; icon: string; label: string }>,
  }));

  for (const mapping of mappings) {
    const info = getZoneInfo(mapping.zone);
    for (const dayIndex of mapping.preferredDays) {
      if (dayIndex >= 0 && dayIndex < 7) {
        summary[dayIndex].zones.push({
          zone: mapping.zone,
          icon: info.icon,
          label: info.label,
        });
      }
    }
  }

  return summary;
}

/**
 * Get the preferred day for a zone. Returns the first preferred day, or 4 (Thursday) as fallback.
 */
export function getPreferredDay(
  zone: CategoryKey,
  mappings: ZoneDayMapping[] = DEFAULT_ZONE_MAPPINGS
): number {
  const mapping = mappings.find((m) => m.zone === zone);
  return mapping?.preferredDays[0] ?? 4; // Thursday as overflow
}

// ============================================
// Storage
// ============================================

const ZONE_CONFIG_KEY = "bayit-zone-config";

export function loadZoneMappings(): ZoneDayMapping[] {
  if (typeof window === "undefined") return DEFAULT_ZONE_MAPPINGS;
  const stored = localStorage.getItem(ZONE_CONFIG_KEY);
  if (!stored) return DEFAULT_ZONE_MAPPINGS;
  try {
    return JSON.parse(stored) as ZoneDayMapping[];
  } catch {
    return DEFAULT_ZONE_MAPPINGS;
  }
}

export function saveZoneMappings(mappings: ZoneDayMapping[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ZONE_CONFIG_KEY, JSON.stringify(mappings));
}

const ZONE_MODE_KEY = "bayit-zone-mode";

export function isZoneModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ZONE_MODE_KEY) === "true";
}

export function setZoneModeEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ZONE_MODE_KEY, enabled ? "true" : "false");
}
