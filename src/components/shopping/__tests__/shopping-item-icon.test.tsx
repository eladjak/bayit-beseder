import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ShoppingItemCard } from "@/components/shopping/shopping-item";

const base = { id: "1", checked: false, added_by: "x", created_at: "2026-10-01T00:00:00Z" };

function iconOf(title: string, category: string, props: Record<string, unknown> = {}) {
  const { container } = render(
    <ShoppingItemCard item={{ ...base, title, category }} onToggle={() => {}} onRemove={() => {}} {...props} />
  );
  return container.querySelector('span[aria-hidden]')?.textContent;
}

describe("ShoppingItemCard icon", () => {
  it("shows the product icon even when the item sits in the generic category", () => {
    expect(iconOf("נורות", "שונות", { categoryIcon: "📦" })).toBe("💡");
  });
  it("ignores a stale cart passed in as itemEmoji", () => {
    expect(iconOf("שמפו", "שונות", { itemEmoji: "🛒", categoryIcon: "📦" })).toBe("🧴");
  });
  it("falls back to the category icon (not the cart) for unknown names", () => {
    expect(iconOf("זזזזז", "שונות", { categoryIcon: "📦" })).toBe("📦");
  });
  it("uses the cart only when nothing else is known", () => {
    expect(iconOf("זזזזז", "קטגוריה-לא-מוכרת")).toBe("🛒");
  });
});

describe("ShoppingItemCard icon with a cart-icon category (real data: household category מזון = 🛒)", () => {
  it("unknown food item does not render the generic cart", () => {
    expect(iconOf("זזזזז", "מזון", { categoryIcon: "🛒" })).not.toBe("🛒");
  });
  it("known product still wins over the cart category icon", () => {
    expect(iconOf("עגבניות", "מזון", { categoryIcon: "🛒", itemEmoji: "🛒" })).toBe("🍅");
  });
});
