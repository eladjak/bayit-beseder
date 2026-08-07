/**
 * Task flag normalisation.
 *
 * WHY THIS EXISTS — the live `tasks.recurring` column is `text`, not `boolean`
 * (schema drift: migration 001 declares `boolean`, production stores `text`).
 * PostgREST therefore returns the STRINGS "true" / "false", and in JavaScript
 * `!!"false"` is `true`. Every task looked recurring, which meant:
 *   · `markComplete` never wrote `status = 'completed'` for one-off tasks
 *   · every task card rendered the "חוזר" badge
 *
 * `src/lib/types/database.ts` declares `recurring: boolean`, so `tsc` cannot
 * catch this, and the unit tests mock a real boolean, so they cannot either.
 *
 * Read the flag through this helper — never `!!task.recurring` — so both the
 * boolean and the text representation resolve identically. This is deliberately
 * a READ-side fix: it does not touch how the data is stored.
 */
export function isRecurring(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "t" || v === "1" || v === "yes";
  }
  if (typeof value === "number") return value === 1;
  return false;
}
