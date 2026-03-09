/**
 * Shared category constants used across dashboard, tasks, stats, and history pages.
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
