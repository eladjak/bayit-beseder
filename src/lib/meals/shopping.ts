import type { IngredientLine, Meal, MealPlanDay } from "./types";

/**
 * "הוסף מצרכים לרשימה" — build SUGGESTED shopping items for the week.
 *
 * Pure function. Returns suggestions only — nothing is written to the DB
 * here. The caller inserts confirmed items into the existing `shopping_items`
 * table (unmodified schema — see PR notes on why this stays separate from
 * the shopping-list feature).
 *
 * De-duplication (requirement 6, "no duplicates on re-run"):
 *  - Against `existingOpenTitles` (titles already on the open shopping list).
 *  - Within the week itself: two meals needing "עוף" merge into ONE line
 *    with combined quantity, not two lines.
 */

export interface SuggestedShoppingItem {
  title: string;
  quantity?: number;
  unit?: string;
  /** Meal names that need this ingredient, for UI context ("בשביל: שניצל, עוף בתנור"). */
  forMeals: string[];
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildWeekIngredientList(
  planDays: Array<Pick<MealPlanDay, "meal_id" | "status">>,
  meals: Meal[]
): Array<{ line: IngredientLine; mealName: string }> {
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const out: Array<{ line: IngredientLine; mealName: string }> = [];

  for (const day of planDays) {
    if (!day.meal_id || day.status === "skipped") continue;
    const meal = mealById.get(day.meal_id);
    if (!meal) continue;
    for (const line of meal.ingredients) {
      out.push({ line, mealName: meal.name });
    }
  }

  return out;
}

/**
 * Merge the week's ingredient lines into suggestions, skipping anything
 * already present (open, unchecked) on the shopping list.
 */
export function suggestShoppingItems(
  weekIngredients: Array<{ line: IngredientLine; mealName: string }>,
  existingOpenTitles: string[]
): SuggestedShoppingItem[] {
  const existingNormalized = new Set(existingOpenTitles.map(normalizeTitle));

  const merged = new Map<string, SuggestedShoppingItem>();

  for (const { line, mealName } of weekIngredients) {
    const key = normalizeTitle(line.name);
    if (existingNormalized.has(key)) continue; // already on the list

    const current = merged.get(key);
    if (current) {
      if (line.quantity && current.quantity !== undefined && line.unit === current.unit) {
        current.quantity += line.quantity;
      } else if (line.quantity && current.quantity === undefined) {
        current.quantity = line.quantity;
        current.unit = current.unit ?? line.unit;
      }
      if (!current.forMeals.includes(mealName)) current.forMeals.push(mealName);
    } else {
      merged.set(key, {
        title: line.name,
        quantity: line.quantity,
        unit: line.unit,
        forMeals: [mealName],
      });
    }
  }

  return [...merged.values()];
}
