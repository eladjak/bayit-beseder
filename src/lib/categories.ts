/**
 * Shared category constants – single source of truth for task categories.
 * Used across dashboard, tasks, weekly, stats, and history pages.
 */

/** Map Hebrew category names (from the DB) to internal category keys */
export const CATEGORY_NAME_TO_KEY: Record<string, string> = {
  "מטבח": "kitchen",
  "אמבטיה": "bathroom",
  "סלון": "living",
  "חדר שינה": "bedroom",
  "כביסה": "laundry",
  "חוץ": "outdoor",
  "חיות מחמד": "pets",
  "כללי": "general",
};

/** Map internal category keys back to Hebrew names (for DB lookups) */
export const CATEGORY_KEY_TO_NAME: Record<string, string> = {
  kitchen: "מטבח",
  bathroom: "אמבטיה",
  living: "סלון",
  bedroom: "חדר שינה",
  laundry: "כביסה",
  outdoor: "חוץ",
  pets: "חיות מחמד",
  general: "כללי",
};

/** All category keys (excluding "all") */
export const CATEGORY_KEYS = [
  "kitchen",
  "bathroom",
  "living",
  "bedroom",
  "laundry",
  "outdoor",
  "pets",
  "general",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/** Filter-friendly list that includes "all" */
export const CATEGORY_FILTER_KEYS = ["all", ...CATEGORY_KEYS] as const;

// ------------------------------------------------------------------
// Visual maps
// ------------------------------------------------------------------

/** Hex colors per category (used for borders, badges, charts) */
export const CATEGORY_COLORS: Record<string, string> = {
  kitchen: "#F59E0B",
  bathroom: "#3B82F6",
  living: "#8B5CF6",
  bedroom: "#EC4899",
  laundry: "#06B6D4",
  outdoor: "#84CC16",
  pets: "#F97316",
  general: "#10B981",
};

/** Hebrew display labels */
export const CATEGORY_LABELS: Record<string, string> = {
  all: "הכל",
  kitchen: "מטבח",
  bathroom: "אמבטיה",
  living: "סלון",
  bedroom: "חדר שינה",
  laundry: "כביסה",
  outdoor: "חיצוני",
  pets: "חיות מחמד",
  general: "כללי",
};

/** Emoji icons */
export const CATEGORY_ICONS: Record<string, string> = {
  kitchen: "🍽️",
  bathroom: "🚿",
  living: "🛋️",
  bedroom: "🛏️",
  laundry: "👕",
  outdoor: "🌿",
  pets: "🐱",
  general: "🏠",
};

/** Tailwind background classes (used in weekly day badges) */
export const CATEGORY_BG_CLASSES: Record<string, string> = {
  kitchen: "bg-amber-500",
  bathroom: "bg-cyan-500",
  living: "bg-emerald-500",
  bedroom: "bg-violet-500",
  laundry: "bg-blue-500",
  outdoor: "bg-lime-500",
  pets: "bg-orange-500",
  general: "bg-slate-500",
};

/** Illustration paths */
export const CATEGORY_ILLUSTRATIONS: Record<string, string> = {
  kitchen: "/illustrations/category-kitchen.jpg",
  bathroom: "/illustrations/category-bathroom.jpg",
  living: "/illustrations/category-living.jpg",
  bedroom: "/illustrations/category-bedroom.jpg",
  laundry: "/illustrations/category-laundry.jpg",
  outdoor: "/illustrations/category-outdoor.jpg",
  pets: "/illustrations/category-pets.jpg",
  general: "/illustrations/category-general.jpg",
};

// ------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------

export function getCategoryColor(key: string): string {
  return CATEGORY_COLORS[key] ?? "#6B7280";
}

export function getCategoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

export function getCategoryIcon(key: string): string {
  return CATEGORY_ICONS[key] ?? "🏠";
}
