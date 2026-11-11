import { describe, expect, it } from "vitest";
import { chooseNextTask } from "../useTodayModel";

describe("today task priority", () => {
  it("chooses overdue before today, then oldest", () => {
    const tasks = [
      { id: "oldest", due_date: null, created_at: "2026-01-01" },
      { id: "today", due_date: "2026-11-11", created_at: "2026-03-01" },
      { id: "overdue", due_date: "2026-11-10", created_at: "2026-04-01" },
    ];
    expect(chooseNextTask(tasks, "2026-11-11")?.id).toBe("overdue");
    expect(chooseNextTask(tasks.slice(0, 2), "2026-11-11")?.id).toBe("today");
    expect(chooseNextTask(tasks.slice(0, 1), "2026-11-11")?.id).toBe("oldest");
  });
});

import { isQuietTime } from '../useTodayModel';

describe('quiet hours in Jerusalem', () => {
  it('allows celebration on an ordinary afternoon', () => {
    expect(isQuietTime(new Date('2026-12-10T12:00:00Z'))).toBe(false);
  });
  it('blocks 23:00 in Israel and Friday evening in winter', () => {
    expect(isQuietTime(new Date('2026-12-10T21:00:00Z'))).toBe(true);
    expect(isQuietTime(new Date('2026-12-11T14:00:00Z'))).toBe(true);
  });
});

// These checks also cover truthfulness when there is no linked partner or meal.
import { describe as suite, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { PartnerTrace } from '../PartnerTrace';
import { DayDone } from '../DayDone';
vi.mock('@/hooks/useCopy', () => ({ useCopy: () => ({ c: (key: string) => key }) }));
vi.mock('@/components/v2/Illustration', () => ({ Illustration: () => <span>illustration</span> }));
vi.mock('@/lib/safe-confetti', () => ({ fireCelebration: vi.fn() }));
import { fireCelebration } from '@/lib/safe-confetti';
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); vi.clearAllMocks(); });
suite('today states', () => {
  it('hides the partner trace without a partner', () => {
    const { container } = render(<PartnerTrace task="Laundry" completedAt="2026-11-11T10:00:00Z" />);
    expect(container.innerHTML).toBe('');
  });
  it('celebrates once during the day and shows done text', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-12-10T12:00:00Z'));
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
    render(<DayDone date="2026-12-10" />);
    expect(screen.getByText('done')).toBeTruthy(); expect(fireCelebration).toHaveBeenCalledTimes(1);
    cleanup(); render(<DayDone date="2026-12-10" />); expect(fireCelebration).toHaveBeenCalledTimes(1);
  });
  it('does not celebrate at 23:00 Israel time or Friday evening', () => {
    vi.useFakeTimers(); Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
    vi.setSystemTime(new Date('2026-12-10T21:00:00Z')); const { unmount } = render(<DayDone date="2026-12-10" />); unmount();
    vi.setSystemTime(new Date('2026-12-11T14:00:00Z')); render(<DayDone date="2026-12-11" />); expect(fireCelebration).not.toHaveBeenCalled();
  });
});

import { fireEvent, waitFor } from '@testing-library/react';
import { TodayV2 } from '../TodayV2';
const mockData = vi.hoisted(() => ({
  mark: vi.fn(), undo: vi.fn(), success: vi.fn(),
  task: { id: 'task-1', title: 'Laundry', household_id: 'home', assigned_to: null, category_id: null, due_date: '2020-01-01', status: 'pending', recurring: 'true', created_at: '2020-01-01' },
}));
vi.mock('sonner', () => ({ toast: { success: mockData.success, error: vi.fn() } }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { id: 'user', name: 'Elad', household_id: 'home' }, loading: false, refetch: vi.fn() }) }));
vi.mock('@/hooks/useHousehold', () => ({ useHousehold: () => ({ loading: false, status: 'ready', household: { name: 'Home' }, retry: vi.fn() }) }));
vi.mock('@/hooks/useHouseholdMembers', () => ({ useHouseholdMembers: () => ({ members: [] }) }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: [mockData.task], loading: false, error: null, refetch: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/hooks/useCompletions', () => ({ useCompletions: () => ({ completions: [], loading: false, error: null, refetch: vi.fn(), isCompletedToday: () => false, markComplete: mockData.mark, undoComplete: mockData.undo }) }));
vi.mock('@/hooks/useCategories', () => ({ useCategories: () => ({ categoryMap: {} }) }));
vi.mock('@/hooks/useShoppingList', () => ({ useShoppingList: () => ({ items: [], storage: 'server', loading: false, loadError: null }) }));
vi.mock('../TodayMeal', () => ({ TodayMeal: () => <div>noMeal</div> }));

suite('completion flow', () => {
 it('waits for confirmation, passes recurring and lets the user undo', async () => {
   let resolve!: (value: { id: string }) => void;
   mockData.mark.mockReturnValueOnce(new Promise(r => { resolve = r; })); mockData.undo.mockResolvedValue(true);
   render(<TodayV2/>); fireEvent.click(screen.getByRole('checkbox'));
   expect(mockData.mark).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-1', recurring: true }));
   expect(mockData.success).not.toHaveBeenCalled();
   resolve({ id: 'confirmed' }); await waitFor(() => expect(mockData.success).toHaveBeenCalledOnce());
   const options = mockData.success.mock.calls[0][1]; await options.action.onClick(); expect(mockData.undo).toHaveBeenCalledWith('task-1');
 });
 it('shows a retry beside a failed task and no success', async () => {
   mockData.mark.mockResolvedValueOnce(null); render(<TodayV2/>); fireEvent.click(screen.getByRole('checkbox'));
   expect(await screen.findByRole('alert')).toBeTruthy(); expect(mockData.success).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'retry' })).toBeTruthy();
 });
 it('shows an honest empty shopping list', () => { render(<TodayV2/>); expect(screen.getByText('shoppingEmpty')).toBeTruthy(); });
});
