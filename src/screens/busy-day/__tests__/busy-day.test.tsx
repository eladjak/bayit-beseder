import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const state = vi.hoisted(() => ({ flag: null as boolean | null, fail: false, toast: vi.fn(), rpc: vi.fn() }));
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => state.flag }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale: 'he', t: (key: string) => key }) }));
vi.mock('@/hooks/useCopy', () => ({ useCopy: (copy: { he: Record<string, string> }) => ({ c: (key: string) => copy.he[key] }) }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('sonner', () => ({ toast: state.toast }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/lib/il-date', () => ({ ilToday: () => '2026-11-11' }));
const db = vi.hoisted(() => {
  const chain = (data: unknown) => {
    const q: Record<string, unknown> = {};
    for (const name of ['select', 'eq', 'lte', 'in', 'order']) q[name] = () => q;
    q.single = async () => ({ data, error: null });
    q.then = (resolve: (value: unknown) => void) => resolve({ data, error: null });
    return q;
  };
  return { auth: { getUser: async () => ({ data: { user: { id: 'user' } }, error: null }) }, from: (table: string) => chain(table === 'profiles' ? { household_id: 'home' } : table === 'tasks' ? [{ id: 'due', title: 'משימה', due_date: '2026-11-11', status: 'pending', recurring: false }, { id: 'future', title: 'עתיד', due_date: '2026-11-12', status: 'pending', recurring: false }] : []), rpc: (...args: unknown[]) => { state.rpc(...args); return { single: async () => state.fail ? { data: null, error: { message: 'failed' } } : { data: { id: 'completion', task_id: 'due', user_id: 'user', completed_at: new Date().toISOString() }, error: null } }; } };
});
vi.mock('@/lib/supabase', () => ({ createClient: () => db }));
vi.mock('@/components/SupabaseProvider', () => ({ useSupabase: () => db }));
import { BusyDayV2, selectEssentialTasks } from '../BusyDayV2';
import { readBusyDay } from '../useBusyDay';
import EmergencyPage from '@/app/(app)/emergency/page';

afterEach(() => cleanup());
beforeEach(() => { localStorage.clear(); state.fail = false; state.flag = null; state.toast.mockReset(); state.rpc.mockReset(); });
describe('busy day contract', () => {
  it('shows only essential due tasks', async () => {
    render(<BusyDayV2 />);
    expect(await screen.findByText('משימה')).toBeTruthy();
    expect(screen.queryByText('עתיד')).toBeNull();
    expect(selectEssentialTasks([{ id: 'old', due_date: '2026-11-10', status: 'completed', recurring: false }], '2026-11-11', () => false, {})).toEqual([]);
  }, 15000);
  it('shares the legacy device key', () => { localStorage.setItem('bayit-beseder-emergency-mode', 'true'); expect(readBusyDay()).toBe(true); });
  it('completes and undoes through the real completion hook', async () => {
    render(<BusyDayV2 />);
    const check = await screen.findByRole('checkbox');
    fireEvent.click(check);
    await waitFor(() => expect(state.rpc).toHaveBeenCalledWith('transition_task_completion', expect.objectContaining({ p_task_id: 'due', p_action: 'complete' })));
    await waitFor(() => expect(state.toast).toHaveBeenCalled());
    expect(check.getAttribute('aria-checked')).toBe('true');
    const action = state.toast.mock.calls[0][1].action;
    action.onClick();
    await waitFor(() => expect(state.rpc).toHaveBeenCalledWith('transition_task_completion', expect.objectContaining({ p_task_id: 'due', p_action: 'undo' })));
    await waitFor(() => expect(check.getAttribute('aria-checked')).toBe('false'));
  });
  it('shows retry and no success on failure, then retries', async () => {
    state.fail = true; render(<BusyDayV2 />);
    fireEvent.click(await screen.findByRole('checkbox'));
    expect(await screen.findByText('לא הצלחנו לשמור. נסו שוב.')).toBeTruthy();
    expect(state.toast).not.toHaveBeenCalled();
    state.fail = false; fireEvent.click(screen.getByRole('button', { name: 'נסו שוב' }));
    await waitFor(() => expect(state.toast).toHaveBeenCalled());
    expect(state.rpc).toHaveBeenCalledTimes(2);
  });
  it('renders the old page when unknown or off, including transitions', async () => {
    const view = render(<EmergencyPage />);
    expect(screen.queryByText('יום עמוס? רק מה שחייב היום')).toBeNull();
    state.flag = true; view.rerender(<EmergencyPage />);
    expect(await screen.findByText('יום עמוס? רק מה שחייב היום')).toBeTruthy();
    state.flag = false; view.rerender(<EmergencyPage />);
    expect(screen.queryByText('יום עמוס? רק מה שחייב היום')).toBeNull();
  });
});
