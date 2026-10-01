import { describe, it, expect } from "vitest";
import {
  classifyItem,
  buildCategoryModel,
  DICTIONARY_SIZE,
  DICTIONARY_DUPLICATES,
  TAXONOMY,
} from "@/lib/shopping-taxonomy";

const CASES: Array<[string, string]> = [
  ["עגבניות שרי", "veg"], ["מלפפון", "veg"], ["תפוחי אדמה", "veg"], ["תפו\"א", "veg"], ["בצל סגול", "veg"],
  ["תפוחים", "fruit"], ["בננה", "fruit"], ["לימונים", "fruit"], ["אבטיח", "fruit"],
  ["כוסברה", "herbs"], ["פטרוזיליה", "herbs"], ["נענע", "herbs"],
  ["לחם אחיד", "bakery"], ["פיתות", "bakery"], ["חלה", "bakery"], ["קרואסון", "bakery"],
  ["חלב 3%", "dairy"], ["חלב שקדים", "dairy"], ["יוגורט תות", "dairy"], ["גבינת שמנת", "dairy"], ["קוטג׳ תנובה", "dairy"], ["תנובה", "dairy"],
  ["ביצים L", "eggs"], ["ביצה", "eggs"],
  ["חזה עוף", "meat"], ["בשר טחון", "meat"], ["סלמון", "meat"], ["נקניקיות", "meat"],
  ["שמן זית", "basics"], ["קמח", "basics"], ["סוכר", "basics"], ["מלח", "basics"],
  ["אבקת אפיה", "baking"], ["אבקת אפייה", "baking"], ["שמרים", "baking"],
  ["אורז", "grains"], ["פסטה", "grains"], ["קוסקוס", "grains"], ["שיבולת שועל", "grains"],
  ["עדשים", "legumes"], ["שעועית לבנה", "legumes"],
  ["טונה בשימורים", "canned"], ["תירס שימורים", "canned"], ["זיתים", "canned"], ["רסק עגבניות", "canned"],
  ["קטשופ", "sauces"], ["טחינה", "sauces"], ["חרדל", "sauces"], ["רוטב סויה", "sauces"],
  ["דבש", "spreads"], ["ריבה", "spreads"], ["נוטלה", "spreads"],
  ["פפריקה", "spices"], ["כמון", "spices"], ["קינמון", "spices"],
  ["שקדים", "nuts"], ["אגוזי מלך", "nuts"], ["צימוקים", "nuts"],
  ["במבה", "snacks"], ["שוקולד מריר", "snacks"], ["עוגיות", "snacks"],
  ["קולה", "drinks"], ["מים", "drinks"], ["בירה", "drinks"], ["קפה", "drinks"],
  ["גלידה", "frozen"], ["שניצל קפוא", "frozen"], ["ירקות קפואים", "frozen"], ["פיצה", "frozen"],
  ["סבון כלים", "cleaning"], ["אקונומיקה", "cleaning"], ["שקיות אשפה", "cleaning"],
  ["נייר טואלט", "paper"], ["צלחות חד פעמיות", "paper"], ["נייר אלומיניום", "paper"],
  ["שמפו", "hygiene"], ["משחת שיניים", "hygiene"], ["דאודורנט", "hygiene"],
  ["חיתולים", "baby"], ["תמ\"ל", "baby"], ["חטיף לתינוקות", "baby"],
  ["אקמול", "health"], ["ויטמין D", "health"], ["פלסטרים", "health"],
  ["אוכל לחתולים", "pets"], ["חול לארגז", "pets"], ["חטיף לכלבים", "pets"],
  ["נורות", "misc"], ["סוללות", "misc"],
];

describe("classifyItem", () => {
  for (const [title, expected] of CASES) {
    it(`${title} -> ${expected}`, () => {
      expect(classifyItem(title)?.categoryId).toBe(expected);
    });
  }

  it("returns null for unknown / empty input instead of guessing", () => {
    expect(classifyItem("")).toBeNull();
    expect(classifyItem("   ")).toBeNull();
    expect(classifyItem("זזזזזז קקקק")).toBeNull();
  });

  it("handles prefixes (ה/ל/ב) and plural forms", () => {
    expect(classifyItem("הלחם")?.categoryId).toBe("bakery");
    expect(classifyItem("לשמן זית")?.categoryId).toBe("basics");
    expect(classifyItem("עגבניות")?.categoryId).toBe(classifyItem("עגבניה")?.categoryId);
  });
});

describe("dictionary health", () => {
  it("has several hundred distinct normalised keys", () => {
    expect(DICTIONARY_SIZE).toBeGreaterThanOrEqual(500);
  });
  it("no key is claimed by two different categories", () => {
    expect(DICTIONARY_DUPLICATES).toEqual([]);
  });
  it("every taxonomy category is reachable and has an icon", () => {
    for (const c of TAXONOMY) expect(c.icon).toBeTruthy();
  });
});

describe("buildCategoryModel", () => {
  const seed = ["ירקות", "פירות", "עשבי תיבול", "מוצרי בסיס", "מוצרי חלב", "חלב", "בשר, ביצים ודגים", "קטניות ותוספות", "מאפים ודגנים", "אגוזים", "קפואים", "שימורים", "תבלינים", "ממרחים", "מטבלים ורטבים", "משקאות", "חטיפים ומתוקים", "מצרכים לאפייה", "ניקיון וכביסה", "תרופות", "חיות מחמד", "שונות"];
  const model = buildCategoryModel(seed.map((name, i) => ({ name, sort_order: i })));

  it("re-files items stuck in 'שונות' by name, using the household's own rows", () => {
    expect(model.resolveCategory("עגבניות", "שונות")).toBe("ירקות");
    expect(model.resolveCategory("חיתולים", "שונות")).toBe("תינוקות"); // virtual category
    expect(model.resolveCategory("לחם", "שונות")).toBe("מאפים ודגנים"); // alias of bread
  });

  it("respects a deliberate category choice", () => {
    expect(model.resolveCategory("עגבניות", "קפואים")).toBe("קפואים");
  });

  it("keeps unknown items in 'שונות' and never throws on empty", () => {
    expect(model.resolveCategory("זזזזז", "שונות")).toBe("שונות");
    expect(model.resolveCategory("", undefined)).toBe("שונות");
  });

  it("legacy generic categories are treated as unsorted", () => {
    expect(model.resolveCategory("חלב", "מזון")).toBe("מוצרי חלב");
  });

  it("lists categories in store-walk order when the household never reordered", () => {
    const i = (n: string) => model.orderedNames.indexOf(n);
    expect(i("ירקות")).toBeLessThan(i("מאפים ודגנים"));
    expect(i("מאפים ודגנים")).toBeLessThan(i("מוצרי חלב"));
    expect(i("קפואים")).toBeGreaterThan(i("משקאות"));
    expect(model.orderedNames[model.orderedNames.length - 1]).toBe("שונות");
    expect(model.orderedNames).toContain("היגיינה וטיפוח");
  });

  it("keeps a hand-made order if the household reordered", () => {
    const custom = buildCategoryModel(["משקאות", "ירקות", "שונות"].map((name, i) => ({ name, sort_order: i })));
    expect(custom.orderedNames.slice(0, 3)).toEqual(["משקאות", "ירקות", "שונות"].slice(0, 2).concat(custom.orderedNames[2]));
    expect(custom.orderedNames[0]).toBe("משקאות");
  });
});
