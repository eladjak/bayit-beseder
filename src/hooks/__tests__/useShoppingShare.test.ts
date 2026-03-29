import { renderHook } from "@testing-library/react";
import { useShoppingShare } from "@/hooks/useShoppingShare";
import type { ShoppingItem } from "@/hooks/useShoppingList";

function makeItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "test-id",
    title: "עגבניות",
    category: "ירקות",
    checked: false,
    added_by: "user1",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("useShoppingShare", () => {
  it("formats empty list correctly", () => {
    const { result } = renderHook(() => useShoppingShare());
    expect(result.current.formatShoppingList([])).toBe("");
  });

  it("ignores checked items", () => {
    const { result } = renderHook(() => useShoppingShare());
    const items = [
      makeItem({ title: "חלב", checked: true }),
      makeItem({ title: "לחם", checked: false }),
    ];
    const text = result.current.formatShoppingList(items);
    expect(text).toContain("לחם");
    expect(text).not.toContain("חלב");
  });

  it("groups items by category", () => {
    const { result } = renderHook(() => useShoppingShare());
    const items = [
      makeItem({ title: "עגבניות", category: "ירקות", checked: false }),
      makeItem({ title: "מלפפונים", category: "ירקות", checked: false }),
      makeItem({ title: "חלב", category: "חלב", checked: false }),
    ];
    const text = result.current.formatShoppingList(items);
    // Header present
    expect(text).toContain("🛒 רשימת קניות");
    // Categories present
    expect(text).toContain("ירקות:");
    expect(text).toContain("חלב:");
    // Items present
    expect(text).toContain("• עגבניות");
    expect(text).toContain("• מלפפונים");
    expect(text).toContain("• חלב");
  });

  it("includes quantity and unit when present", () => {
    const { result } = renderHook(() => useShoppingShare());
    const items = [
      makeItem({ title: "ביצים", quantity: 12, unit: "יח׳", checked: false }),
    ];
    const text = result.current.formatShoppingList(items);
    expect(text).toContain("ביצים (12 יח׳)");
  });

  it("does not include quantity when quantity is 1", () => {
    const { result } = renderHook(() => useShoppingShare());
    const items = [
      makeItem({ title: "לחם", quantity: 1, checked: false }),
    ];
    const text = result.current.formatShoppingList(items);
    expect(text).not.toContain("(1");
  });

  it("returns empty string when all items are checked", () => {
    const { result } = renderHook(() => useShoppingShare());
    const items = [makeItem({ checked: true }), makeItem({ id: "2", checked: true })];
    expect(result.current.formatShoppingList(items)).toBe("");
  });
});
