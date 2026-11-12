import { describe, it, expect } from 'vitest';
import { todayMeal } from '../useMealsModel';

describe('meal selection in Jerusalem', () => {
  const days = [{ date: '2026-06-02', mealName: 'June meal' }, { date: '2026-12-02', mealName: 'December meal' }];
  it('uses the new day at 00:30 in summer', () => expect(todayMeal(days, new Date('2026-06-01T21:30:00Z'))?.mealName).toBe('June meal'));
  it('uses the new day at 00:30 in December', () => expect(todayMeal(days, new Date('2026-12-01T22:30:00Z'))?.mealName).toBe('December meal'));
});

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import MealsV2 from '../MealsV2';
import MealsPage from '@/app/(app)/meals/page';
const mocks = vi.hoisted(() => ({ swap: vi.fn(), regenerate: vi.fn(), alternatives: vi.fn(), toast: vi.fn(), flag: null as boolean | null, empty: false, error: null as string | null, loading: false, unplanned: false }));
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => mocks.flag }));
vi.mock('@/hooks/useMealPlanner', () => ({ useMealPlanner: () => ({ loading:mocks.loading, error:mocks.error, week:mocks.loading ? null : {weekStart:'2026-12-01', days:mocks.empty ? [] : [{date:'2026-12-02', dayName:'רביעי', mealId:mocks.unplanned ? null : 'old', mealName:mocks.unplanned ? null : 'Soup', status:'planned', ruleNotes:[]}]}, meals:[], tonightPrep:[], regenerateWeek:mocks.regenerate, swapDay:mocks.swap, fetchAlternatives:mocks.alternatives, refetch:vi.fn(), markDay:vi.fn(), addMeal:vi.fn() }) }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), {success:mocks.toast, error:vi.fn()}) }));
vi.mock('@/components/v2/Sheet', () => ({ Sheet: ({open,title,children}: {open:boolean;title:string;children:React.ReactNode}) => open ? <div role="dialog" aria-label={title}>{children}</div> : null }));
vi.mock('@/components/v2/Dialog', () => ({ Dialog: ({open,title,children}: {open:boolean;title:string;children:React.ReactNode}) => open ? <div role="dialog" aria-label={title}>{children}</div> : null }));

describe('meal interactions', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.swap.mockResolvedValue(undefined); mocks.alternatives.mockResolvedValue([{id:'new',name:'Pasta',tags:[],prepLeadHours:0}]); mocks.flag = false; mocks.empty = false; mocks.error = null; mocks.loading = false; mocks.unplanned = false; });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  async function chooseMeal() { fireEvent.click(screen.getByRole('button', {name:/Soup/})); fireEvent.click(screen.getByRole('button', {name:'החלפת ארוחה'})); fireEvent.click(await screen.findByRole('button', {name:'Pasta'})); }
  it('swaps and undo restores the prior meal', async () => { render(<MealsV2 />); await chooseMeal(); await waitFor(() => expect(mocks.toast).toHaveBeenCalled()); const action = mocks.toast.mock.calls[0][1].action; action.onClick(); await waitFor(() => expect(mocks.swap).toHaveBeenLastCalledWith('2026-12-02', 'old')); });
  it('does not regenerate before confirmation', () => { render(<MealsV2 />); fireEvent.click(screen.getByRole('button', {name:'תוכנית חדשה לשבוע'})); expect(mocks.regenerate).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', {name:'כן, להחליף'})); expect(mocks.regenerate).toHaveBeenCalledOnce(); });
  it('adds only selected ingredients', async () => { const fetchMock = vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({suggestions:[{title:'Rice'}, {title:'Beans'}]})}).mockResolvedValueOnce({ok:true,json:async()=>({added:1})}); vi.stubGlobal('fetch', fetchMock); render(<MealsV2 />); fireEvent.click(screen.getByRole('button', {name:'הוספת מצרכים לקניות'})); fireEvent.click(await screen.findByRole('checkbox', {name:'Beans'})); fireEvent.click(screen.getByRole('button', {name:'הוספה לרשימה'})); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2)); expect(JSON.parse(fetchMock.mock.calls[1][1].body).items).toEqual([{title:'Rice'}]); });
  it('shows retry without success after a failed swap', async () => { mocks.swap.mockRejectedValueOnce(new Error('failed')); render(<MealsV2 />); await chooseMeal(); expect((await screen.findByRole('alert')).textContent).toContain('לא הצלחנו לשמור'); expect(screen.getByRole('button',{name:'ניסיון נוסף'})).toBeTruthy(); expect(mocks.toast).not.toHaveBeenCalled(); });
  it('offers one action in the empty state without an empty today card', () => { mocks.empty = true; render(<MealsV2 />); expect(screen.getByText('עדיין אין תוכנית ארוחות לשבוע.')).toBeTruthy(); expect(screen.getByRole('button', {name:'בנו תוכנית לשבוע'})).toBeTruthy(); expect(screen.queryByText('אין ארוחה מתוכננת')).toBeNull(); });
  it('reports a missing household separately', () => { mocks.error = 'לא נמצא בית משק בית מקושר למשתמש.'; render(<MealsV2 />); expect(screen.getByRole('alert').textContent).toContain('לא נמצא בית מקושר'); });
  it('shows a loading state before the plan arrives', () => { mocks.loading = true; render(<MealsV2 />); expect(screen.getByRole('status').textContent).toContain('טוענים'); });
  it('does not offer an irreversible swap for a day with no previous meal', () => { mocks.unplanned = true; render(<MealsV2 />); fireEvent.click(screen.getByRole('button', {name:/אין ארוחה מתוכננת/})); expect(screen.queryByRole('button', {name:'החלפת ארוחה'})).toBeNull(); });
  it('shows an honest offline notice', () => { vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); render(<MealsV2 />); expect(screen.getByRole('status').textContent).toContain('אין חיבור לאינטרנט'); vi.restoreAllMocks(); });
  it('renders the old page off and survives null, true, false changes', () => { mocks.flag = null; const {rerender} = render(<MealsPage />); expect(screen.getByText('אפשרויות תכנון')).toBeTruthy(); mocks.flag = true; rerender(<MealsPage />); expect(screen.getByText('התוכנית לשבוע, במקום אחד')).toBeTruthy(); mocks.flag = false; rerender(<MealsPage />); expect(screen.getByText('אפשרויות תכנון')).toBeTruthy(); });
});
