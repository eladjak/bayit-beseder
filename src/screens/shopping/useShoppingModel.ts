import { useMemo, useState } from 'react';
import { buildCategoryModel } from '@/lib/shopping-taxonomy';
import type { ShoppingItem } from '@/hooks/useShoppingList';
import type { HouseholdCategoryLike } from '@/lib/shopping-taxonomy';
export function useShoppingModel(items: ShoppingItem[], categories: HouseholdCategoryLike[]) {
 const [collapsed, setCollapsed] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('bayit-shopping-collapsed') || '[]')); } catch { return new Set(); } });
 const groups = useMemo(() => { const model = buildCategoryModel(categories); const map = new Map<string, ShoppingItem[]>(); for (const item of items.filter(i => !i.checked)) { const name = model.resolveCategory(item.title, item.category); map.set(name, [...(map.get(name) ?? []), item]); } return [...new Set(model.orderedNames)].filter(name => map.has(name)).map(name => ({ name, items: map.get(name)! })); }, [items, categories]);
 function toggle(name: string) { setCollapsed(prev => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); try { localStorage.setItem('bayit-shopping-collapsed', JSON.stringify([...next])); } catch {} return next; }); }
 return { groups, bought: items.filter(i => i.checked), collapsed, toggle };
}
