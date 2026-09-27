import type { Database } from "@/lib/types/database";
import type { IngredientLine, Meal, MealPlanDay } from "./types";

type MealRow = Database["public"]["Tables"]["meals"]["Row"];
type MealPlanRow = Database["public"]["Tables"]["meal_plan"]["Row"];

export function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    household_id: row.household_id,
    name: row.name,
    who_eats: row.who_eats,
    prep_lead_hours: row.prep_lead_hours,
    prep_note: row.prep_note,
    min_repeat_days: row.min_repeat_days,
    tags: row.tags,
    ingredients: ((row.ingredients as unknown) as IngredientLine[]) ?? [],
    last_served_at: row.last_served_at,
    active: row.active,
    created_at: row.created_at,
  };
}

export function rowToMealPlanDay(row: MealPlanRow): MealPlanDay {
  return {
    id: row.id,
    household_id: row.household_id,
    meal_id: row.meal_id,
    plan_date: row.plan_date,
    status: row.status,
    note: row.note,
    created_at: row.created_at,
  };
}
