import type { Meal, MealPlanDay } from "./types";
import { needsDefrost } from "./types";
import { ilDateAndHourToUtc } from "./timezone";

/**
 * "מה להפשיר הערב" — the defrost reminder.
 *
 * Assumes dinner is served at 19:00 Israel time (MEAL_HOUR_IL below — the
 * schema is dinner-centric v1, so there is exactly one slot/day). For every
 * planned meal whose dinner-time falls within the next 36 hours AND needs
 * prep lead time, computes when defrost/prep should start.
 *
 * DST-correct: uses jerusalemWallTimeToUtc, so a December call and an August
 * call for the "same" 19:00 produce different UTC instants, as they must.
 */

export const MEAL_HOUR_IL = 19;
const WINDOW_HOURS = 36;
const HOUR_MS = 3_600_000;

export interface DefrostItem {
  date: string; // YYYY-MM-DD of the meal
  mealId: string;
  mealName: string;
  prepNote: string | null;
  prepLeadHours: number;
  /** UTC ISO instant the meal is expected to be served (19:00 Israel time that day). */
  mealTime: string;
  /** UTC ISO instant defrost/prep should start. */
  startAt: string;
  /** true if `startAt` is now or in the past — i.e. "start it tonight/now". */
  startNow: boolean;
  /** Hours from `now` until `startAt` (negative = already overdue). */
  hoursUntilStart: number;
}

export interface TonightPrepResult {
  items: DefrostItem[];
  whatsappText: string;
}

export interface ComputeTonightPrepOptions {
  now: Date;
  /** Planned days (today + the next couple of days is enough — anything further is ignored). */
  days: Array<Pick<MealPlanDay, "plan_date" | "meal_id" | "status">>;
  meals: Meal[];
}

export function computeTonightPrep(options: ComputeTonightPrepOptions): TonightPrepResult {
  const { now, days, meals } = options;
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const windowEnd = new Date(now.getTime() + WINDOW_HOURS * HOUR_MS);

  const items: DefrostItem[] = [];

  for (const day of days) {
    if (!day.meal_id) continue;
    if (day.status === "cooked" || day.status === "skipped") continue;
    const meal = mealById.get(day.meal_id);
    if (!meal || !needsDefrost(meal)) continue;

    const mealTime = ilDateAndHourToUtc(day.plan_date, MEAL_HOUR_IL);
    if (mealTime < now || mealTime > windowEnd) continue;

    const startAt = new Date(mealTime.getTime() - meal.prep_lead_hours * HOUR_MS);
    const hoursUntilStart = (startAt.getTime() - now.getTime()) / HOUR_MS;

    items.push({
      date: day.plan_date,
      mealId: meal.id,
      mealName: meal.name,
      prepNote: meal.prep_note,
      prepLeadHours: meal.prep_lead_hours,
      mealTime: mealTime.toISOString(),
      startAt: startAt.toISOString(),
      startNow: startAt <= now,
      hoursUntilStart,
    });
  }

  // Soonest defrost start first.
  items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return { items, whatsappText: buildTonightPrepWhatsAppText(items) };
}

export function buildTonightPrepWhatsAppText(items: DefrostItem[]): string {
  if (items.length === 0) {
    return "אין מה להפשיר הערב 🎉 אין ארוחות מתוכננות שדורשות הכנה מראש ב-36 השעות הקרובות.";
  }

  const lines = items.map((item) => {
    const what = item.prepNote ?? `${item.mealName} מהמקפיא`;
    if (item.startNow) {
      return `🔴 עכשיו: להוציא ${what} — הארוחה מתוכננת ל-${item.date} (${item.mealName}).`;
    }
    const hoursLabel = Math.max(0, Math.round(item.hoursUntilStart));
    return `🕐 עוד כ-${hoursLabel} שעות: להוציא ${what} — הארוחה מתוכננת ל-${item.date} (${item.mealName}).`;
  });

  return `מה להפשיר הערב — בית בסדר:\n\n${lines.join("\n")}`;
}
