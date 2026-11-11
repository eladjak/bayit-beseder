import { describe, it, expect } from 'vitest';

describe('busy day contract', () => {
  it('selects only due pending or completed tasks and excludes old completed tasks', async () => {
    const { selectEssentialTasks } = await import('../BusyDayV2');
    const tasks = [
      { id: 'due', due_date: '2026-11-11', status: 'pending', recurring: false },
      { id: 'future', due_date: '2026-11-12', status: 'pending', recurring: false },
      { id: 'old-done', due_date: '2026-11-10', status: 'completed', recurring: false },
    ];
    expect(selectEssentialTasks(tasks, '2026-11-11', () => false, {})).toEqual([tasks[0]]);
  });
  it('exposes the shared device mode', async () => {
    const { readBusyDay } = await import('../useBusyDay');
    localStorage.setItem('bayit-beseder-emergency-mode', 'true');
    expect(readBusyDay()).toBe(true);
  });
  it('renders the redesigned page', async () => {
    const { BusyDayV2 } = await import('../BusyDayV2');
    expect(BusyDayV2).toBeTypeOf('function');
  });
});
