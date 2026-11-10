import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useShoppingList } from '../useShoppingList';
const { order } = vi.hoisted(() => ({ order: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ isSupabaseConfigured: () => true, createClient: () => ({ from: () => ({ select: () => ({ order }) }), channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: () => {} }) }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
describe('shopping device fallback', () => {
  beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_NEW_UI', 'true'); localStorage.clear(); order.mockReset(); });
  it('does not invent items, preserves device items after retry and reload', async () => {
    order.mockResolvedValueOnce({data:null,error:{message:'offline'}}).mockResolvedValue({data:[],error:null});
    const { result, unmount } = renderHook(() => useShoppingList());
    await waitFor(() => expect(result.current.storage).toBe('device'));
    expect(result.current.items).toEqual([]);
    await act(async () => { await result.current.addItem('Milk','food'); });
    await act(async () => { await result.current.retry(); });
    expect(result.current.storage).toBe('server');
    expect(result.current.deviceItems.map(item => item.title)).toEqual(['Milk']);
    expect(localStorage.getItem('bayit-beseder-shopping-list')).toContain('Milk');
    unmount();
    const next = renderHook(() => useShoppingList());
    await waitFor(() => expect(next.result.current.deviceItems.length).toBe(1));
  });
});

it('retains existing fallback defaults when the redesign switch is off', async () => {
  vi.stubEnv('NEXT_PUBLIC_NEW_UI', 'false');
  localStorage.clear();
  order.mockResolvedValueOnce({data:null,error:{message:'offline'}});
  const { result } = renderHook(() => useShoppingList());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.items.some(item => item.id === 's1')).toBe(true);
});
