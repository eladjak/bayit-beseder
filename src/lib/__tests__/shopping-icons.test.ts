import { describe, it, expect } from "vitest";
import { getEmojiForItem } from "@/lib/shopping-autocomplete";

// Real-world items. Every one must show ITS OWN product icon, never the generic
// supermarket cart. Many of these (marked cart-before) used to render a cart
// because getEmojiForItem() returned "🛒" for anything missing from a ~230 item list,
// and the card then preferred that "🛒" over the category icon.
const ITEMS: Array<[string, string]> = [
  ["חלב", "🥛"],
  ["לחם", "🍞"],
  ["ביצים", "🥚"],
  ["ביצי חופש", "🥚"], // cart-before
  ["עגבניות", "🍅"],
  ["מלפפונים", "🥒"],
  ["בננות", "🍌"],
  ["קוטג'", "🥛"],
  ["גבינה צהובה", "🧀"],
  ["חזה עוף", "🍗"],
  ["שניצלים", "🍗"],
  ["סלמון", "🐟"],
  ["אוכל לחיות", "🐾"], // cart-before
  ["חול לארגז", "🐱"], // cart-before
  ["אוכל לחתולים", "🐱"],
  ["נורות", "💡"], // cart-before
  ["סוללות", "🔋"], // cart-before
  ["טישו", "🧻"], // cart-before
  ["נייר טואלט", "🧻"],
  ["סבון כלים", "🧴"],
  ["אבקת כביסה", "🧺"],
  ["שמפו", "🧴"], // cart-before
  ["משחת שיניים", "🪥"], // cart-before
  ["חיתולים", "👶"], // cart-before
  ["אקמול", "💊"],
  ["פלסטרים", "🩹"],
  ["צ'יפס", "🍟"], // cart-before
  ["גלידה", "🍦"],
  ["אורז בסמטי", "🍚"], // cart-before
  ["ספגטי", "🍝"], // cart-before
  ["קורנפלור", "🌽"], // cart-before
  ["קמח", "🌾"],
  ["סוכר", "🧂"],
  ["שמן זית", "🫒"],
  ["אבקת שום", "🧄"], // cart-before
  ["כורכום", "🌿"],
  ["עדשים", "🫘"],
  ["טונה", "🐟"],
  ["זיתים", "🫒"],
  ["קטשופ", "🍅"],
  ["טחינה", "🫙"],
  ["דבש", "🍯"],
  ["נס קפה", "☕"], // cart-before
  ["קפה", "☕"],
  ["תה ירוק", "🍵"],
  ["מיץ גזר", "🧃"], // cart-before
  ["בירה", "🍺"],
  ["במבה", "🥜"],
  ["שוקולד", "🍫"],
  ["סלק", "🥕"], // cart-before
];

describe("product icon per item (never the generic cart)", () => {
  it("covers 50 items", () => {
    expect(ITEMS.length).toBe(50);
  });
  for (const [title, expected] of ITEMS) {
    it(`${title} -> ${expected}`, () => {
      const icon = getEmojiForItem(title);
      expect(icon).not.toBe("🛒");
      expect(icon).toBe(expected);
    });
  }
});
