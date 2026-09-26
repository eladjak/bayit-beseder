import type { Meal } from "./types";
import type { RecentMealUse } from "./generator";

/**
 * Suggest alternatives for swapping a single day's meal.
 *
 * Pure function — no DB writes. Excludes the currently-planned meal, respects
 * each meal's own repeat window against `recentHistory`, and ranks by
 * least-recently-served (deterministic — array order is the final tie-break).
 */
export interface SwapOptions {
  meals: Meal[];
  date: string; // YYYY-MM-DD, the day being swapped
  currentMealId: string | null;
  recentHistory?: RecentMealUse[];
  count?: number;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round(Math.abs(db - da) / 86_400_000);
}

function repeatWindow(meal: Meal): number {
  return Math.max(5, meal.min_repeat_days);
}

function lastUseBefore(mealId: string, beforeDate: string, recentHistory: RecentMealUse[]): string | null {
  let best: string | null = null;
  for (const use of recentHistory) {
    if (use.meal_id !== mealId) continue;
    if (use.plan_date >= beforeDate) continue;
    if (best === null || use.plan_date > best) best = use.plan_date;
  }
  return best;
}

export function suggestSwapAlternatives(options: SwapOptions): Meal[] {
  const { meals, date, currentMealId, recentHistory = [], count = 3 } = options;

  const pool = meals.filter((m) => m.active && m.id !== currentMealId);

  const respectsWindow = (meal: Meal) => {
    const last = lastUseBefore(meal.id, date, recentHistory);
    if (!last) return true;
    // Inclusive, matching generator.ts: a gap EQUAL to the window still
    // counts as "within" it and must be excluded, so > not >=.
    //
    // Honesty note (2026-09-25): unlike in generator.ts, this specific `>`
    // vs `>=` distinction currently has NO observable effect on this
    // function's return value. `effectivePool` falls back to the FULL pool
    // (a strict superset) whenever `strictPool` is too small, and ranking
    // below always picks by daysSince regardless of which pool an item came
    // from — so a boundary-case meal's rank is identical either way. It's
    // kept `>` purely so this file's semantics don't silently disagree with
    // generator.ts's (the two SHOULD mean the same thing), not because it
    // was proven to change behavior here. Verified by hand-tracing + a
    // sabotage/restore pass that produced identical output both ways.
    return daysBetween(last, date) > repeatWindow(meal);
  };

  const strictPool = pool.filter(respectsWindow);
  const effectivePool = strictPool.length >= count ? strictPool : pool;

  const scored = effectivePool.map((meal, idx) => {
    const last = lastUseBefore(meal.id, date, recentHistory);
    const daysSince = last ? daysBetween(last, date) : Number.MAX_SAFE_INTEGER;
    return { meal, idx, daysSince };
  });

  scored.sort((a, b) => {
    if (a.daysSince !== b.daysSince) return b.daysSince - a.daysSince;
    return a.idx - b.idx;
  });

  return scored.slice(0, count).map((s) => s.meal);
}
