import type { IngredientLine } from "./types";

/**
 * Default meal rotation — ~25 simple, realistic Israeli family dinners.
 *
 * Elad said "תתחיל מברירת מחדל" (start from sensible defaults) — this is that
 * default pack, applied PER HOUSEHOLD on first use (see seed.ts), never as
 * global rows. Any household can edit/delete/add on top of it.
 *
 * Kashrut-neutral: every meal is tagged exactly one of meat / dairy / parve,
 * never mixed (enforced by hasConflictingKashrutTags + a test).
 */
export interface MealSeed {
  name: string;
  who_eats: string[];
  prep_lead_hours: number;
  prep_note: string | null;
  min_repeat_days: number;
  tags: string[];
  ingredients: IngredientLine[];
}

const BOTH = ["אלעד", "ענבל"];

export const MEAL_SEED_PACK: MealSeed[] = [
  {
    name: "שניצל עם פירה",
    who_eats: BOTH,
    prep_lead_hours: 12,
    prep_note: "להוציא שניצלים מהמקפיא",
    min_repeat_days: 7,
    tags: ["meat", "kids-ok"],
    ingredients: [
      { name: "שניצלים", quantity: 1, unit: "ק\"ג" },
      { name: "תפוחי אדמה", quantity: 1, unit: "ק\"ג" },
      { name: "חלב", quantity: 1, unit: "כוס" },
    ],
  },
  {
    name: "פסטה ברוטב עגבניות",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 5,
    tags: ["parve", "kids-ok", "light"],
    ingredients: [
      { name: "פסטה", quantity: 500, unit: "גרם" },
      { name: "רסק עגבניות", quantity: 1, unit: "קופסה" },
      { name: "שום", quantity: 3, unit: "שיניים" },
    ],
  },
  {
    name: "שקשוקה",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 5,
    tags: ["dairy", "kids-ok", "light"],
    ingredients: [
      { name: "ביצים", quantity: 6, unit: "יח'" },
      { name: "עגבניות", quantity: 6, unit: "יח'" },
      { name: "פלפל", quantity: 1, unit: "יח'" },
    ],
  },
  {
    name: "עוף בתנור עם ירקות",
    who_eats: BOTH,
    prep_lead_hours: 18,
    prep_note: "להוציא עוף מהמקפיא בערב הקודם",
    min_repeat_days: 7,
    tags: ["meat", "shabbat"],
    ingredients: [
      { name: "עוף שלם", quantity: 1, unit: "יח'" },
      { name: "תפוחי אדמה", quantity: 1, unit: "ק\"ג" },
      { name: "גזר", quantity: 4, unit: "יח'" },
    ],
  },
  {
    name: "קציצות ברוטב",
    who_eats: BOTH,
    prep_lead_hours: 14,
    prep_note: "להוציא בשר טחון מהמקפיא",
    min_repeat_days: 7,
    tags: ["meat", "kids-ok"],
    ingredients: [
      { name: "בשר טחון", quantity: 500, unit: "גרם" },
      { name: "בצל", quantity: 1, unit: "יח'" },
      { name: "רסק עגבניות", quantity: 1, unit: "קופסה" },
    ],
  },
  {
    name: "מרק עדשים",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 6,
    tags: ["parve", "light"],
    ingredients: [
      { name: "עדשים כתומות", quantity: 300, unit: "גרם" },
      { name: "גזר", quantity: 3, unit: "יח'" },
      { name: "בצל", quantity: 1, unit: "יח'" },
    ],
  },
  {
    name: "פיצה ביתית",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: "בצק צריך תפיחה של שעה",
    min_repeat_days: 7,
    tags: ["dairy", "kids-ok"],
    ingredients: [
      { name: "קמח", quantity: 500, unit: "גרם" },
      { name: "גבינה צהובה", quantity: 300, unit: "גרם" },
      { name: "רסק עגבניות", quantity: 1, unit: "קופסה" },
    ],
  },
  {
    name: "אורז עם עוף בקארי",
    who_eats: BOTH,
    prep_lead_hours: 12,
    prep_note: "להוציא חזה עוף מהמקפיא",
    min_repeat_days: 7,
    tags: ["meat"],
    ingredients: [
      { name: "אורז", quantity: 2, unit: "כוסות" },
      { name: "חזה עוף", quantity: 500, unit: "גרם" },
      { name: "אבקת קארי", quantity: 1, unit: "כפית" },
    ],
  },
  {
    name: "טורטייה עם גבינות וירקות",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 5,
    tags: ["dairy", "kids-ok", "light"],
    ingredients: [
      { name: "טורטיות", quantity: 6, unit: "יח'" },
      { name: "גבינה צהובה", quantity: 200, unit: "גרם" },
      { name: "עגבניה", quantity: 2, unit: "יח'" },
    ],
  },
  {
    name: "דגים בתנור",
    who_eats: BOTH,
    prep_lead_hours: 10,
    prep_note: "להוציא דגים מהמקפיא",
    min_repeat_days: 7,
    tags: ["parve"],
    ingredients: [
      { name: "פילה דג", quantity: 600, unit: "גרם" },
      { name: "לימון", quantity: 1, unit: "יח'" },
    ],
  },
  {
    name: "חביתה עם סלט",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 4,
    tags: ["dairy", "kids-ok", "light"],
    ingredients: [
      { name: "ביצים", quantity: 6, unit: "יח'" },
      { name: "מלפפון", quantity: 3, unit: "יח'" },
      { name: "עגבניה", quantity: 3, unit: "יח'" },
    ],
  },
  {
    name: "המבורגר ביתי",
    who_eats: BOTH,
    prep_lead_hours: 12,
    prep_note: "להוציא קציצות המבורגר מהמקפיא",
    min_repeat_days: 8,
    tags: ["meat", "kids-ok"],
    ingredients: [
      { name: "בשר טחון", quantity: 500, unit: "גרם" },
      { name: "לחמניות", quantity: 4, unit: "יח'" },
    ],
  },
  {
    name: "מוקפץ ירקות ואטריות",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 5,
    tags: ["parve", "light"],
    ingredients: [
      { name: "אטריות סיניות", quantity: 300, unit: "גרם" },
      { name: "ירקות מוקפצים קפואים", quantity: 500, unit: "גרם" },
    ],
  },
  {
    name: "קובה מרק",
    who_eats: BOTH,
    prep_lead_hours: 20,
    prep_note: "להוציא קובה מהמקפיא בערב הקודם",
    min_repeat_days: 10,
    tags: ["meat", "shabbat"],
    ingredients: [
      { name: "קובה קפוא", quantity: 1, unit: "ק\"ג" },
      { name: "דלעת", quantity: 1, unit: "יח'" },
    ],
  },
  {
    name: "פסטה ברוטב שמנת עם פטריות",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 6,
    tags: ["dairy"],
    ingredients: [
      { name: "פסטה", quantity: 500, unit: "גרם" },
      { name: "שמנת לבישול", quantity: 1, unit: "קופסה" },
      { name: "פטריות", quantity: 250, unit: "גרם" },
    ],
  },
  {
    name: "כדורי בשר בסגנון תאילנדי",
    who_eats: BOTH,
    prep_lead_hours: 14,
    prep_note: "להוציא בשר טחון מהמקפיא",
    min_repeat_days: 9,
    tags: ["meat"],
    ingredients: [
      { name: "בשר טחון", quantity: 500, unit: "גרם" },
      { name: "רוטב סויה", quantity: 2, unit: "כפות" },
    ],
  },
  {
    name: "פלאפל וסלטים",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 7,
    tags: ["parve", "kids-ok"],
    ingredients: [
      { name: "פלאפל קפוא", quantity: 1, unit: "ק\"ג" },
      { name: "פיתות", quantity: 6, unit: "יח'" },
    ],
  },
  {
    name: "מרק ירקות עם קטניות",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 6,
    tags: ["parve", "light", "leftovers-friendly"],
    ingredients: [
      { name: "תפוחי אדמה", quantity: 3, unit: "יח'" },
      { name: "גזר", quantity: 3, unit: "יח'" },
      { name: "חומוס יבש", quantity: 200, unit: "גרם" },
    ],
  },
  {
    name: "עוף בגריל עם אורז",
    who_eats: BOTH,
    prep_lead_hours: 12,
    prep_note: "להוציא שיפודי עוף מהמקפיא",
    min_repeat_days: 7,
    tags: ["meat"],
    ingredients: [
      { name: "שיפודי עוף", quantity: 1, unit: "ק\"ג" },
      { name: "אורז", quantity: 2, unit: "כוסות" },
    ],
  },
  {
    name: "לזניה ירקות",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: "דורש זמן הכנה ארוך בערב עצמו",
    min_repeat_days: 10,
    tags: ["dairy", "shabbat"],
    ingredients: [
      { name: "דפי לזניה", quantity: 1, unit: "חבילה" },
      { name: "גבינה צהובה", quantity: 300, unit: "גרם" },
      { name: "קישואים", quantity: 3, unit: "יח'" },
    ],
  },
  {
    name: "נקניקיות עם פירה",
    who_eats: ["אלעד"],
    prep_lead_hours: 8,
    prep_note: "להוציא נקניקיות מהמקפיא",
    min_repeat_days: 10,
    tags: ["meat", "kids-ok"],
    ingredients: [
      { name: "נקניקיות", quantity: 500, unit: "גרם" },
      { name: "תפוחי אדמה", quantity: 1, unit: "ק\"ג" },
    ],
  },
  {
    name: "סלט קינואה עם גבינה בולגרית",
    who_eats: ["ענבל"],
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 6,
    tags: ["dairy", "light"],
    ingredients: [
      { name: "קינואה", quantity: 200, unit: "גרם" },
      { name: "גבינה בולגרית", quantity: 200, unit: "גרם" },
    ],
  },
  {
    name: "מרק עוף עם אטריות",
    who_eats: BOTH,
    prep_lead_hours: 16,
    prep_note: "להוציא פרגיות/עוף מהמקפיא",
    min_repeat_days: 8,
    tags: ["meat", "shabbat", "leftovers-friendly"],
    ingredients: [
      { name: "עוף לבישול", quantity: 1, unit: "ק\"ג" },
      { name: "אטריות דקות", quantity: 200, unit: "גרם" },
    ],
  },
  {
    name: "ריזוטו פטריות",
    who_eats: BOTH,
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 8,
    tags: ["dairy"],
    ingredients: [
      { name: "אורז לריזוטו", quantity: 300, unit: "גרם" },
      { name: "פטריות", quantity: 300, unit: "גרם" },
      { name: "פרמזן", quantity: 100, unit: "גרם" },
    ],
  },
  {
    name: "טאקו בשר",
    who_eats: BOTH,
    prep_lead_hours: 14,
    prep_note: "להוציא בשר טחון מהמקפיא",
    min_repeat_days: 9,
    tags: ["meat", "kids-ok"],
    ingredients: [
      { name: "בשר טחון", quantity: 500, unit: "גרם" },
      { name: "טורטיות טאקו", quantity: 8, unit: "יח'" },
    ],
  },
];
