# Shopping List Overhaul Plan
## BayitBeSeder — 2026-04-01

---

## Bugs to Fix

1. **Edit existing items** — title, quantity, category (currently impossible)
2. **Move items between categories** — drag or long-press menu
3. **Purchased items → bottom section** — "purchased" zone with clear button
4. **Smart autocomplete** — suggest items with emoji as user types
5. **Sub-categories** — nested grouping under main categories
6. **removeItem stale closure** — use itemsRef.current
7. **Collapse state persistence** — localStorage

## Features to Add

1. **Inline edit** — tap item name to edit, tap category to change
2. **Purchased zone** — checked items drop to collapsible "purchased" section at bottom
3. **Clear purchased** — trash-can button to bulk-delete purchased items
4. **Autocomplete with emoji** — predefined item suggestions (200+ common grocery items with emoji)
5. **Category quick-add** — "+" button per category to add item directly to that category
6. **Quantity +/- buttons** — increment/decrement on item card

## Files to Modify

1. `src/app/(app)/shopping/page.tsx` — major restructure
2. `src/hooks/useShoppingList.ts` — add editItem, moveItem, fix stale closure
3. `src/components/shopping/shopping-item.tsx` — inline edit, quantity buttons
4. `src/lib/shopping-autocomplete.ts` — NEW: autocomplete data + search
5. `src/components/shopping/purchased-section.tsx` — NEW: purchased items zone
