import type { MealPlanStatus } from "./types";

/**
 * "leftovers shifts plan by a day" (requirement 4).
 *
 * Marking a day as leftovers means: we're eating what's already in the fridge
 * tonight, so the meal that WAS planned for that day is not lost — it slides
 * to the next day, and so on, until we hit a day that's already `cooked`
 * (never overwrite something already committed) or run out of week.
 *
 * Pure function — `days` must be the 7 days of one week, sorted ascending by
 * date, contiguous. Does not touch the DB.
 */
export interface ShiftableDay {
  date: string;
  mealId: string | null;
  status: MealPlanStatus;
}

export function shiftPlanForLeftovers<T extends ShiftableDay>(
  days: T[],
  leftoverDate: string
): T[] {
  const idx = days.findIndex((d) => d.date === leftoverDate);
  if (idx === -1) return days;

  const result = days.map((d) => ({ ...d }));

  // Movable suffix: days after `idx` that are not yet `cooked`.
  let end = idx;
  for (let i = idx + 1; i < result.length; i++) {
    if (result[i].status === "cooked") break;
    end = i;
  }

  for (let i = end; i > idx; i--) {
    const prev = days[i - 1];
    result[i] = {
      ...result[i],
      mealId: prev.mealId,
      // A day that inherits a "leftovers" slot becomes a normal planned day.
      status: prev.status === "leftovers" ? "planned" : prev.status,
    };
  }

  result[idx] = { ...result[idx], mealId: null, status: "leftovers" };

  return result;
}
