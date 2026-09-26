import { HEBREW_DAY_NAMES } from "./week";

/**
 * Hebrew-friendly display helpers for meal-planner dates.
 *
 * Internally every date stays plain ISO YYYY-MM-DD — that's the stable API
 * contract (JSON, DB, tests all key off it). This file is ONLY for what a
 * human reads on screen. Fixed 2026-09-25 after Elad reviewed a screenshot
 * showing raw "2026-09-28" strings in the UI.
 */

/** "2026-09-28" -> "28.9" (Israeli day.month, no leading zeros). */
export function toHebrewShortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}.${m}`;
}

/**
 * Hebrew weekday name for an ISO date. Parses at UTC noon specifically so
 * this is safe to call in ANY local timezone purely for weekday arithmetic —
 * it is NOT used for anything time-sensitive (that's timezone.ts's job).
 */
export function hebrewDayName(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const idx = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return HEBREW_DAY_NAMES[idx];
}

/** "2026-09-28" -> "יום שני, 28.9" — for compact contexts (day cards). */
export function toHebrewDayAndDate(iso: string): string {
  return `${hebrewDayName(iso)}, ${toHebrewShortDate(iso)}`;
}

/**
 * "2026-09-28" -> "ליום שני, 28.9" — for sentences ("...להוציא X ליום שני, 28.9").
 * `hebrewDayName` already includes the word "יום" (e.g. "יום שני"), so this
 * prefixes just the "ל" — NOT another "יום" (that would read "ליום יום שני").
 * שבת has no "יום" prefix in Hebrew at all ("לשבת", not "ליום שבת").
 */
export function forHebrewDayLabel(iso: string): string {
  const name = hebrewDayName(iso);
  const prefixed = name === "שבת" ? "לשבת" : `ל${name}`;
  return `${prefixed}, ${toHebrewShortDate(iso)}`;
}
