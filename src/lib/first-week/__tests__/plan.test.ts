import { describe, expect, it } from 'vitest';
import { DEFAULT_WEEK, RECIPES, shoppingList, swapMeal } from '../plan';

describe('first week', () => {
  it('starts with a deterministic seven-day plant-based selection', () => {
    expect(DEFAULT_WEEK).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(DEFAULT_WEEK.map(i => RECIPES[i].name)).toHaveLength(7);
  });
  it('combines quantities and scales them with servings', () => {
    expect(shoppingList(DEFAULT_WEEK, 2).find(x => x.name === 'אורז')).toEqual({ name: 'אורז', quantity: 300, unit: 'גרם' });
    expect(shoppingList(DEFAULT_WEEK, 2).filter(x => x.name === 'אורז')).toHaveLength(1);
  });
  it('swaps only the chosen day and recalculates ingredients', () => {
    const swapped = swapMeal(DEFAULT_WEEK, 0);
    expect(swapped.slice(1)).toEqual(DEFAULT_WEEK.slice(1));
    expect(shoppingList(swapped, 1).some(x => x.name === 'פסטה')).toBe(false);
    expect(DEFAULT_WEEK[0]).toBe(0);
  });
});
