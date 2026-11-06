export type Ingredient = { name: string; quantity: number; unit: string };
export type Recipe = { name: string; ingredients: Ingredient[] };
// Quantities are approximate portions for one person; all options are plant-based.
export const RECIPES: Recipe[] = [
  { name: 'פסטה ברוטב עגבניות', ingredients: [{ name: 'פסטה', quantity: 100, unit: 'גרם' }, { name: 'עגבניות מרוסקות', quantity: 200, unit: 'גרם' }] },
  { name: 'אורז ועדשים', ingredients: [{ name: 'אורז', quantity: 75, unit: 'גרם' }, { name: 'עדשים', quantity: 75, unit: 'גרם' }] },
  { name: 'טוסט חומוס וסלט', ingredients: [{ name: 'לחם', quantity: 2, unit: 'פרוסות' }, { name: 'חומוס מוכן', quantity: 100, unit: 'גרם' }, { name: 'עגבנייה', quantity: 1, unit: 'יחידות' }] },
  { name: 'תפוחי אדמה ושעועית בתנור', ingredients: [{ name: 'תפוחי אדמה', quantity: 2, unit: 'יחידות' }, { name: 'שעועית מבושלת', quantity: 150, unit: 'גרם' }] },
  { name: 'קוסקוס וירקות', ingredients: [{ name: 'קוסקוס', quantity: 100, unit: 'גרם' }, { name: 'גזר', quantity: 1, unit: 'יחידות' }] },
  { name: 'מרק עדשים וגזר', ingredients: [{ name: 'עדשים', quantity: 100, unit: 'גרם' }, { name: 'גזר', quantity: 2, unit: 'יחידות' }] },
  { name: 'אורז עם שעועית ועגבניות', ingredients: [{ name: 'אורז', quantity: 75, unit: 'גרם' }, { name: 'שעועית מבושלת', quantity: 150, unit: 'גרם' }, { name: 'עגבנייה', quantity: 1, unit: 'יחידות' }] },
  { name: 'פסטה עם חומוס ועגבניות', ingredients: [{ name: 'פסטה', quantity: 100, unit: 'גרם' }, { name: 'חומוס מבושל', quantity: 100, unit: 'גרם' }, { name: 'עגבניות מרוסקות', quantity: 100, unit: 'גרם' }] },
];
export const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const DEFAULT_WEEK = [0, 1, 2, 3, 4, 5, 6];
export function shoppingList(week: number[], servings: number): Ingredient[] {
  const items = new Map<string, Ingredient>();
  for (const id of week) for (const ingredient of RECIPES[id].ingredients) {
    const key = `${ingredient.name}|${ingredient.unit}`;
    const current = items.get(key);
    if (current) current.quantity += ingredient.quantity * servings;
    else items.set(key, { ...ingredient, quantity: ingredient.quantity * servings });
  }
  return [...items.values()];
}
export function swapMeal(week: number[], day: number): number[] {
  return week.map((id, i) => i === day ? (id + 1) % RECIPES.length : id);
}
