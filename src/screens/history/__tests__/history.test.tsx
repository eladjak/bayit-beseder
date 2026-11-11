import { describe, it, expect } from 'vitest';
import { groupHistory, PAGE_SIZE } from '../useHistoryModel';
describe('history model', () => {
 it('groups newest first by Israel day and supports paging', () => {
  const rows = Array.from({length: PAGE_SIZE + 1}, (_, i) => ({id:String(i), task_id:'a', user_id:'u', completed_at: new Date(Date.UTC(2026,10,10,23,i)).toISOString()}));
  const groups = groupHistory(rows.slice().reverse());
  expect(groups[0].day).toBe('2026-11-11'); expect(groups[0].entries[0].id).toBe(String(PAGE_SIZE)); expect(rows.slice(0,PAGE_SIZE)).toHaveLength(PAGE_SIZE);
 });
});
