/* eslint-disable @typescript-eslint/no-explicit-any -- lightweight component test doubles */
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import WeeklyPage from '../page';
import { addDaysStr } from '@/lib/il-date';

const state = vi.hoisted(() => ({ tasks: [] as any[], profile: { id: 'u1', household_id: 'h1', name: 'Me' } as any, mark: vi.fn(), undo: vi.fn(), create: vi.fn(), update: vi.fn(), success: vi.fn(), error: vi.fn(), completedToday: false }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { success: state.success, error: state.error, info: vi.fn() } }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useCopy', () => ({ useCopy: () => ({ c: (key: string) => key }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: state.profile }) }));
vi.mock('@/hooks/usePartner', () => ({ usePartner: () => ({ partner: null }) }));
vi.mock('@/hooks/useHouseholdMembers', () => ({ useHouseholdMembers: () => ({ members: [] }) }));
vi.mock('@/hooks/useCalendarEvents', () => ({ useCalendarEvents: () => ({ events: [], eventsByDate: new Map(), loading: false, connected: false }) }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: state.tasks, loading: false, createTask: state.create, updateTask: state.update, refetch: vi.fn() }) }));
vi.mock('@/hooks/useCompletions', () => ({ useCompletions: () => ({ markComplete: state.mark, undoComplete: state.undo, isCompletedToday: () => state.completedToday, refetch: vi.fn() }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ canUse: () => true }) }));
vi.mock('@/hooks/useZoneConfig', () => ({ useZoneConfig: () => ({ zoneMode: false, zoneMappings: [] }) }));
vi.mock('@/hooks/useWeeklyGenerator', () => ({ useWeeklyGenerator: () => ({}) }));
vi.mock('@/lib/haptics', () => ({ haptic: vi.fn() }));
vi.mock('@/components/weekly/weekly-header', () => ({ WeeklyHeader: () => null }));
vi.mock('@/components/weekly/weekly-smart-suggestions', () => ({ WeeklySmartSuggestions: () => null }));
vi.mock('@/components/weekly/weekly-zone-panel', () => ({ WeeklyZonePanel: () => null }));
vi.mock('@/components/weekly/weekly-stats', () => ({ WeeklyStats: () => <div>weekly-summary</div> }));
vi.mock('@/components/weekly/weekly-day-card', () => ({ WeeklyDayCard: ({ dayLoad, onToggleComplete, onAddTask }: any) => <div>{dayLoad.tasks.map((task: any) => <button key={task.id} onClick={() => onToggleComplete(task)} data-status={task.status}>{task.title}</button>)}<button onClick={() => onAddTask(dayLoad.date, 'Table', 'general')}>add-{dayLoad.date}</button></div> }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); state.tasks = []; state.profile = { id: 'u1', household_id: 'h1', name: 'Me' }; state.completedToday = false; });
function task(overrides = {}) { return { id: 't1', title: 'Clean', due_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date()), category_id: 'general', status: 'pending', recurring: true, ...overrides }; }
it('empty week displays an action and no meaningless summary', () => { render(<WeeklyPage />); expect(screen.getByText('weeklyEmpty')).toBeTruthy(); expect(screen.queryByText('weekly-summary')).toBeNull(); });
it('recurring completion failure shows error and retry without a success toast', async () => { state.tasks = [task()]; state.mark.mockResolvedValue(null); render(<WeeklyPage />); fireEvent.click(screen.getByText('Clean')); await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(state.mark).toHaveBeenCalledWith({ taskId: 't1', userId: 'u1', recurring: true }); expect(state.update).not.toHaveBeenCalled(); expect(state.success).not.toHaveBeenCalled(); state.mark.mockResolvedValue({ id: 'c1' }); fireEvent.click(screen.getByText('retry')); await waitFor(() => expect(state.success).toHaveBeenCalled()); });
it('prevents double completion while request is pending', () => { state.tasks = [task()]; state.mark.mockReturnValue(new Promise(() => {})); render(<WeeklyPage />); fireEvent.click(screen.getByText('Clean')); fireEvent.click(screen.getByText('Clean')); expect(state.mark).toHaveBeenCalledTimes(1); });
it('reports a missing profile when toggling', async () => { state.tasks = [task()]; state.profile = null; render(<WeeklyPage />); fireEvent.click(screen.getByText('Clean')); expect(screen.getByRole('alert')).toBeTruthy(); });
it('passes quick-add through the page handler', async () => { state.create.mockResolvedValue({ id: 'new' }); render(<WeeklyPage />); fireEvent.click(screen.getAllByText(/^add-/)[0]); await waitFor(() => expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Table', category_id: 'general', status: 'pending', recurring: false }))); });
it.each([
  ['2026-11-11T23:30:00Z', '2026-11-12'],
  ['2026-11-11T21:30:00Z', '2026-11-11'],
  ['2026-12-10T23:30:00Z', '2026-12-11'],
])('only marks a recurring task complete today on its own date at %s (Israel %s)', (instant, today) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
  try {
    state.completedToday = true;
    state.tasks = [task({ due_date: addDaysStr(today, 1) })];
    render(<WeeklyPage />);
    expect(screen.getByText('Clean').getAttribute('data-status')).toBe('pending');
    cleanup();
    state.tasks = [task({ due_date: today })];
    render(<WeeklyPage />);
    expect(screen.getByText('Clean').getAttribute('data-status')).toBe('completed');
  } finally { cleanup(); vi.useRealTimers(); }
});

it('undo uses the completion service and does not announce a new completion', async () => {
  state.tasks = [task({ status: 'completed', recurring: false })]; state.undo.mockResolvedValue(true);
  render(<WeeklyPage />); fireEvent.click(screen.getByText('Clean'));
  await waitFor(() => expect(state.undo).toHaveBeenCalledWith('t1'));
  expect(state.success).not.toHaveBeenCalled();
});
