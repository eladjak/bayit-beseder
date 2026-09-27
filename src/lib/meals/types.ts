/**
 * Shared types for the meal planner (migration 015_meals.sql).
 *
 * These mirror the DB shape but are hand-maintained here (rather than in
 * src/lib/types/database.ts's generated-looking Database type) because
 * migration 015 is NOT YET APPLIED to production — see that file's header.
 */

export interface IngredientLine {
  /** Ingredient name, e.g. "עוף". */
  name: string;
  quantity?: number;
  unit?: string;
}

export type MealTag =
  | "meat"
  | "dairy"
  | "parve"
  | "kids-ok"
  | "light"
  | "shabbat"
  | "leftovers-friendly";

export interface Meal {
  id: string;
  household_id: string;
  name: string;
  who_eats: string[];
  /** Hours of prep lead needed before cooking (0 = no defrost/prep needed). */
  prep_lead_hours: number;
  prep_note: string | null;
  min_repeat_days: number;
  tags: string[];
  ingredients: IngredientLine[];
  last_served_at: string | null; // YYYY-MM-DD
  active: boolean;
  created_at: string;
}

export type MealInsert = Omit<Meal, "id" | "created_at" | "last_served_at" | "active"> &
  Partial<Pick<Meal, "last_served_at" | "active">>;

export type MealPlanStatus = "planned" | "prepped" | "cooked" | "skipped" | "leftovers";

export interface MealPlanDay {
  id: string;
  household_id: string;
  meal_id: string | null;
  plan_date: string; // YYYY-MM-DD
  status: MealPlanStatus;
  note: string | null;
  created_at: string;
}

export type MealPlanDayInsert = Omit<MealPlanDay, "id" | "created_at">;

/** Whether a meal needs any freezer/prep lead time at all. */
export function needsDefrost(meal: Pick<Meal, "prep_lead_hours">): boolean {
  return meal.prep_lead_hours > 0;
}

/** Meat/dairy exclusivity check — kashrut-neutral: a meal is never tagged both. */
export function hasConflictingKashrutTags(tags: string[]): boolean {
  return tags.includes("meat") && tags.includes("dairy");
}
