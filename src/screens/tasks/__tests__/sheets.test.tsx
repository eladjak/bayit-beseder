import { describe, it, expect } from 'vitest';
import { sortTasks } from '../useTasksModel';
import { oldTasks } from '../sheets/ReviewOldSheet';
describe('task sheet models', () => {
 it('sorts by newest, room, who and due date', () => {
  const tasks = [{id:'a',due_date:'2026-01-03',category_id:'z',assigned_to:'z',created_at:'2026-01-01',status:'pending'}, {id:'b',due_date:'2026-01-01',category_id:'a',assigned_to:'a',created_at:'2026-01-02',status:'pending'}];
  expect(sortTasks(tasks,'due').map(t=>t.id)).toEqual(['b','a']);
  expect(sortTasks(tasks,'room').map(t=>t.id)).toEqual(['b','a']);
  expect(sortTasks(tasks,'who').map(t=>t.id)).toEqual(['b','a']);
  expect(sortTasks(tasks,'newest').map(t=>t.id)).toEqual(['b','a']);
 });
 it('selects incomplete tasks more than 14 Jerusalem days overdue', () => {
  const tasks=[{id:'old',due_date:'2026-01-01',status:'pending'}, {id:'boundary',due_date:'2026-01-02',status:'pending'}, {id:'done',due_date:'2025-12-01',status:'completed'}];
  expect(oldTasks(tasks,new Date('2026-01-16T12:00:00Z')).map(t=>t.id)).toEqual(['old']);
 });
});
