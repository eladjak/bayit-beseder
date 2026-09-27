import type { Meal, MealPlanStatus } from "./types";
import { HEBREW_DAY_NAMES } from "./week";

/**
 * Weekly meal-plan generator — pure function, no DB writes, no AI calls
 * (rules-based, per PLAN-PRODUCT-2026-09-25.md §"מתכנן הארוחות מתוכנן לכשלים").
 *
 * Rules (v1):
 *  1. No same meal within max(5, meal.min_repeat_days) days — "within 5 days"
 *     is INCLUSIVE (a gap of exactly 5 days still counts as "within" and is
 *     rejected), so two uses of the same meal must be at least 6 days apart.
 *     Fixed 2026-09-25: the original `<` comparison allowed an exact 5-day
 *     gap through, which read as "no repeat within 5 days" but actually
 *     permitted one. Checked against `recentHistory` (meal_plan rows from
 *     before this week) AND the plan
 *     being built, so a meal never repeats across the week boundary either.
 *  2. Optional: at most 2 meat-tagged meals in a row (default ON).
 *  3. Friday ("ערב שבת") prefers a meal tagged `shabbat` (a bigger meal).
 *  4. Saturday prefers reusing an earlier-in-the-week `leftovers-friendly`
 *     meal, marked with status "leftovers" (schema is dinner-centric — one
 *     slot/day — so "Saturday lunch leftovers-friendly" means: the Saturday
 *     dinner slot defaults to reusing what's already in the fridge).
 *  5. Any date passed in `busyDates` prefers a meal tagged `light`.
 *
 * Deterministic: NO randomness anywhere. Given the same `meals` array (order
 * matters — it is the tie-break) and the same `recentHistory`, the output is
 * always identical. That is what "given seed" means here — there is no RNG
 * seed to configure because there is no RNG.
 */

export interface RecentMealUse {
  meal_id: string;
  plan_date: string; // YYYY-MM-DD
}

export interface GenerateWeekMealPlanOptions {
  meals: Meal[];
  /** Sunday of the target week (Israeli week starts Sunday), local date. */
  weekStartDate: Date;
  /** meal_plan rows from before this week, used to enforce the repeat rule across the boundary. */
  recentHistory?: RecentMealUse[];
  /** YYYY-MM-DD dates in this week that are marked "busy" -> prefer a light meal. */
  busyDates?: string[];
  /** Default true. Set false to disable the "≤2 meat in a row" preference. */
  limitConsecutiveMeat?: boolean;
  /**
   * Days that are ALREADY decided (e.g. persisted rows from a previous partial
   * generation, or a day the user already cooked/skipped) and must be kept
   * as-is rather than regenerated — but they still count for the meat-streak
   * and Saturday-leftovers rules applied to the days generated around them.
   */
  existingByDate?: Record<string, { mealId: string | null; status: MealPlanStatus }>;
}

export interface GeneratedMealDay {
  date: string; // YYYY-MM-DD
  dayName: string;
  mealId: string | null;
  mealName: string | null;
  status: MealPlanStatus;
  /** Human-readable notes about which rule drove/relaxed the pick (for debugging/UI). */
  ruleNotes: string[];
}

const HEBREW_DAYS = HEBREW_DAY_NAMES;

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round(Math.abs(db - da) / 86_400_000);
}

/** The minimum number of days between two uses of `meal` (inclusive floor of 5). */
function repeatWindow(meal: Meal): number {
  return Math.max(5, meal.min_repeat_days);
}

function isMeat(meal: Meal): boolean {
  return meal.tags.includes("meat");
}

/** Most recent use of `meal.id` on or before `beforeDate`, from history + plan-so-far. */
function lastUseBefore(
  mealId: string,
  beforeDate: string,
  recentHistory: RecentMealUse[],
  soFar: GeneratedMealDay[]
): string | null {
  let best: string | null = null;
  for (const use of recentHistory) {
    if (use.meal_id !== mealId) continue;
    if (use.plan_date >= beforeDate) continue;
    if (best === null || use.plan_date > best) best = use.plan_date;
  }
  for (const day of soFar) {
    if (day.mealId !== mealId) continue;
    if (day.date >= beforeDate) continue;
    if (best === null || day.date > best) best = day.date;
  }
  return best;
}

/** Count consecutive meat days immediately before `dayIndex` in the plan built so far. */
function consecutiveMeatBefore(soFar: GeneratedMealDay[], meals: Meal[]): number {
  let count = 0;
  for (let i = soFar.length - 1; i >= 0; i--) {
    const day = soFar[i];
    const meal = meals.find((m) => m.id === day.mealId);
    if (meal && isMeat(meal)) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

interface PickResult {
  meal: Meal | null;
  ruleNotes: string[];
}

/**
 * Pick the best meal for one day. Tries, in order, a "strict" pass (respects
 * the repeat window + meat-streak rule) and — only if strict finds nothing —
 * a "relaxed" pass that ignores the repeat window (so the day is never left
 * empty just because the rotation is small). Ties are broken by array order,
 * which is what makes the whole function deterministic.
 */
function pickMealForDay(
  candidates: Meal[],
  date: string,
  recentHistory: RecentMealUse[],
  soFar: GeneratedMealDay[],
  preferTag: string | null,
  limitConsecutiveMeat: boolean
): PickResult {
  const meatStreak = limitConsecutiveMeat ? consecutiveMeatBefore(soFar, candidates) : 0;

  function passable(meal: Meal, strict: boolean): boolean {
    if (strict) {
      const last = lastUseBefore(meal.id, date, recentHistory, soFar);
      // Inclusive: a gap EQUAL to the window (e.g. exactly 5 days) still
      // counts as "within" the window and is rejected — so <= not <.
      if (last && daysBetween(last, date) <= repeatWindow(meal)) return false;
    }
    if (meatStreak >= 2 && isMeat(meal)) return false;
    return true;
  }

  function best(strict: boolean): Meal | null {
    const pool = candidates.filter((m) => passable(m, strict));
    if (pool.length === 0) return null;

    // Score: preferred-tag match first, then least-recently-served, then
    // array order (stable — gives determinism).
    const scored = pool.map((meal, idx) => {
      const last = lastUseBefore(meal.id, date, recentHistory, soFar);
      const daysSince = last ? daysBetween(last, date) : Number.MAX_SAFE_INTEGER;
      const tagBonus = preferTag && meal.tags.includes(preferTag) ? 1 : 0;
      return { meal, idx, daysSince, tagBonus };
    });
    scored.sort((a, b) => {
      if (a.tagBonus !== b.tagBonus) return b.tagBonus - a.tagBonus;
      if (a.daysSince !== b.daysSince) return b.daysSince - a.daysSince;
      return a.idx - b.idx;
    });
    return scored[0].meal;
  }

  const strictPick = best(true);
  if (strictPick) return { meal: strictPick, ruleNotes: [] };

  const relaxedPick = best(false);
  if (relaxedPick) {
    return {
      meal: relaxedPick,
      ruleNotes: ["כלל-החזרה הוקל (אין מספיק ארוחות שונות בסבב הנוכחי)"],
    };
  }

  return { meal: null, ruleNotes: ["אין ארוחה פעילה זמינה"] };
}

export function generateWeekMealPlan(options: GenerateWeekMealPlanOptions): GeneratedMealDay[] {
  const {
    meals,
    weekStartDate,
    recentHistory = [],
    busyDates = [],
    limitConsecutiveMeat = true,
    existingByDate = {},
  } = options;

  const activeMeals = meals.filter((m) => m.active);
  const busySet = new Set(busyDates);
  const days: GeneratedMealDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const date = formatDate(d);
    const dayName = HEBREW_DAYS[i];
    const isFriday = i === 5;
    const isSaturday = i === 6;

    const existing = existingByDate[date];
    if (existing) {
      const meal = activeMeals.find((m) => m.id === existing.mealId) ?? null;
      days.push({
        date,
        dayName,
        mealId: existing.mealId,
        mealName: meal?.name ?? null,
        status: existing.status,
        ruleNotes: ["כבר נקבע קודם"],
      });
      continue;
    }

    // Saturday: prefer reusing an earlier-in-the-week leftovers-friendly meal.
    if (isSaturday) {
      const leftoverCandidate = [...days]
        .reverse()
        .find((day) => {
          const meal = activeMeals.find((m) => m.id === day.mealId);
          return meal && meal.tags.includes("leftovers-friendly");
        });
      if (leftoverCandidate) {
        const meal = activeMeals.find((m) => m.id === leftoverCandidate.mealId) ?? null;
        days.push({
          date,
          dayName,
          mealId: meal?.id ?? null,
          mealName: meal?.name ?? null,
          status: "leftovers",
          ruleNotes: [`שאריות מ-${leftoverCandidate.dayName}`],
        });
        continue;
      }
    }

    const preferTag = isFriday ? "shabbat" : busySet.has(date) ? "light" : null;
    const { meal, ruleNotes } = pickMealForDay(
      activeMeals,
      date,
      recentHistory,
      days,
      preferTag,
      limitConsecutiveMeat
    );

    days.push({
      date,
      dayName,
      mealId: meal?.id ?? null,
      mealName: meal?.name ?? null,
      status: "planned",
      ruleNotes,
    });
  }

  return days;
}
