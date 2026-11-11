import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const page = readFileSync('src/app/(app)/weekly/page.tsx', 'utf8');
describe('weekly honesty safeguards', () => {
  it('never generates a mock week and provides an empty action', () => {
    expect(page).not.toContain('generateMockWeeklyTasks');
    expect(page).toContain('weeklyEmpty');
  });
  it('uses the completion transition including the recurring flag', () => {
    expect(page).toContain('markComplete({ taskId: task.id, userId: profile.id, recurring: isRecurring(task.recurring) })');
    expect(page).toContain('undoComplete(task.id)');
    expect(page).not.toContain('updateTask(task.id, { status:');
  });
  it('keeps a retryable error beside a failed task', () => {
    expect(page).toContain('completionError');
    expect(page).toContain('retryCompletion');
  });
});

import { renderHook, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useTasks } from '@/hooks/useTasks';

const fake = vi.hoisted(() => {
  const rows: Record<string, unknown>[] = [];
  const db = {
    from: () => ({
      select: () => ({ eq: () => ({ order: async () => ({ data: [...rows], error: null }) }) }),
      insert: (row: Record<string, unknown>) => ({ select: () => ({ single: async () => {
        const saved = { id: 'created', ...row }; rows.push(saved); return { data: saved, error: null };
      } }) }),
    }),
  };
  return { rows, db };
});
vi.mock('@/components/SupabaseProvider', () => ({ useSupabase: () => fake.db }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { household_id: 'family' }, loading: false }) }));

it('quick-add task data is persisted with the current household by useTasks', async () => {
  fake.rows.length = 0;
  const { result } = renderHook(() => useTasks({}));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.createTask({ title: 'Clean table', category_id: 'general', due_date: '2026-11-11', status: 'pending', points: 10, recurring: false });
  });
  expect(fake.rows).toEqual([expect.objectContaining({ title: 'Clean table', household_id: 'family', due_date: '2026-11-11' })]);
  expect(result.current.tasks[0].title).toBe('Clean table');
});
