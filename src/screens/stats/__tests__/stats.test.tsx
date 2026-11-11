import { describe, it, expect } from 'vitest';
import { periodRange, summarize } from '../useStatsModel';
describe('stats model', () => {
 it('uses Israel calendar ranges for week and month', () => {
  expect(periodRange('week', new Date('2026-11-11T12:00:00Z'))).toEqual({start:'2026-11-08', end:'2026-11-12'});
  expect(periodRange('month', new Date('2026-11-11T12:00:00Z'))).toEqual({start:'2026-11-01', end:'2026-11-12'});
 });
 it('counts real completions by day and room without people', () => {
  const result = summarize([{task_id:'a',completed_at:'2026-11-10T23:00:00Z'},{task_id:'b',completed_at:'2026-11-11T12:00:00Z'}], [{id:'a',category_id:'k'},{id:'b',category_id:'k'}], [{id:'k',name:'Kitchen'}]);
  expect(result.total).toBe(2); expect(result.days).toEqual([{label:'2026-11-11',value:2}]); expect(result.rooms).toEqual([{label:'Kitchen',value:2}]);
 });
});
