import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, screen, fireEvent, cleanup } from '@testing-library/react';
import ShoppingV2 from '../ShoppingV2';
import { useShoppingModel } from '../useShoppingModel';
import type { ShoppingItem } from '@/hooks/useShoppingList';
import type { CopyFragment } from '@/lib/i18n/fragments/types';
const mocks = vi.hoisted(() => ({ toggle: vi.fn(), remove: vi.fn(), edit: vi.fn(), toast: vi.fn(), items: [] as ShoppingItem[], storage: 'server', deviceItems: [] as ShoppingItem[], flag: null as boolean | null, loading: false }));
vi.mock('@/hooks/useShoppingList', () => ({ useShoppingList: () => ({ items: mocks.items, loading: mocks.loading, storage: mocks.storage, deviceItems: mocks.deviceItems, retrying: false, retry: vi.fn(), addItem: vi.fn(), toggleItem: mocks.toggle, removeItem: mocks.remove, editItem: mocks.edit }) }));
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => mocks.flag }));
vi.mock('@/hooks/useSeasonalMode', () => ({ useSeasonalMode: () => ({}) }));
vi.mock('@/hooks/useFirstVisit', () => ({ useFirstVisit: () => ({ isFirstVisit: false, dismiss: vi.fn() }) }));
vi.mock('@/hooks/useShoppingCategories', () => ({ useShoppingCategories: () => ({ categories: [] }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { household_id: 'h' }, loading: false }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale: 'he' }) }));
vi.mock('@/hooks/useCopy', () => ({ useCopy: (fragment: CopyFragment) => ({ c: (key: string) => fragment.he[key] }) }));
vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@/components/v2/QuickAdd', () => ({ QuickAdd: () => <div>quick add</div> }));
const item = (id: string, title: string) => ({ id, title, category: 'שונות', checked: false, added_by: 'unknown', created_at: '2026-01-01' });
beforeEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); mocks.items = [item('1','חלב'), item('2','לחם'), item('3','שמפו')]; mocks.storage = 'server'; mocks.deviceItems = []; mocks.loading = false; });
describe('shopping v2', () => {
 it('groups three taxonomy categories', () => { render(<ShoppingV2 />); expect(screen.getByText('חלב וגבינות')).toBeTruthy(); expect(screen.getByText('לחם ומאפים')).toBeTruthy(); expect(screen.getByText('היגיינה וטיפוח')).toBeTruthy(); });
 it('toggles and undo calls the hook again', async () => { render(<ShoppingV2 />); fireEvent.click(screen.getByRole('checkbox', { name: /חלב/ })); expect(mocks.toggle).toHaveBeenCalledWith('1'); const options = mocks.toast.mock.calls[0][1]; options.action.onClick(); expect(mocks.toggle).toHaveBeenCalledTimes(2); });
 it('shows retry when toggle rejects', async () => { mocks.toggle.mockRejectedValueOnce(new Error('failed')); render(<ShoppingV2 />); fireEvent.click(screen.getByRole('checkbox', { name: /חלב/ })); expect(await screen.findByText('לא הצלחנו לעדכן. נסו שוב.')).toBeTruthy(); });
 it('labels device items', () => { mocks.storage = 'device'; render(<ShoppingV2 />); expect(screen.getAllByText(/רק במכשיר הזה/).length).toBeGreaterThan(0); });
 it('steps quantity and never below one', () => { render(<ShoppingV2 />); fireEvent.click(screen.getByRole('button', { name: 'הוספת יחידה לחלב' })); expect(mocks.edit).toHaveBeenCalledWith('1', {quantity: 2}); expect((screen.getByRole('button', { name: 'הפחתת יחידה מחלב' }) as HTMLButtonElement).disabled).toBe(true); });
 it('defers delete and undo cancels it', () => { vi.useFakeTimers(); render(<ShoppingV2 />); fireEvent.click(screen.getByLabelText('מחיקת חלב', {selector: 'summary'})); fireEvent.click(screen.getByRole('button', { name: 'מחיקת חלב' })); expect(screen.queryByText('חלב')).toBeNull(); mocks.toast.mock.calls[0][1].action.onClick(); vi.advanceTimersByTime(5000); expect(mocks.remove).not.toHaveBeenCalled(); vi.useRealTimers(); });
});

it('keeps V1 when off and switches null to true to false safely', async () => { const { default: Page } = await import('@/app/(app)/shopping/page'); mocks.loading = true; mocks.flag = null; const view = render(<Page />); expect(view.container.querySelector('.shimmer')).toBeTruthy(); mocks.flag = true; view.rerender(<Page />); expect(screen.getByText('רשימת קניות')).toBeTruthy(); mocks.flag = false; view.rerender(<Page />); expect(view.container.querySelector('.shimmer')).toBeTruthy(); });

it('renders a repeated category name only once', () => { const categories = [{ name: 'ירקות' }, { name: 'ירקות' }]; const items = [item('4', 'עגבניות')]; const { result } = renderHook(() => useShoppingModel(items, categories)); expect(result.current.groups.filter(group => group.name === 'ירקות')).toHaveLength(1); });

it('commits a pending deletion after five seconds or when leaving the page', () => { vi.useFakeTimers(); const first = render(<ShoppingV2 />); fireEvent.click(screen.getByLabelText('מחיקת חלב', {selector:'summary'})); fireEvent.click(screen.getByRole('button', {name:'מחיקת חלב'})); expect(mocks.remove).not.toHaveBeenCalled(); vi.advanceTimersByTime(5000); expect(mocks.remove).toHaveBeenCalledWith('1'); first.unmount(); mocks.remove.mockClear(); const second = render(<ShoppingV2 />); fireEvent.click(screen.getByLabelText('מחיקת לחם', {selector:'summary'})); fireEvent.click(screen.getByRole('button', {name:'מחיקת לחם'})); second.unmount(); expect(mocks.remove).toHaveBeenCalledWith('2'); vi.useRealTimers(); });
