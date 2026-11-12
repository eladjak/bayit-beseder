import { describe, it, expect } from 'vitest';
import { isQuiet, isRecapTime, weekCount } from '../quiet';

describe('delight timing and weekly count', () => {
 it.each([
  ['2026-11-09T19:59:00Z', false], ['2026-11-09T20:00:00Z', true],
  ['2026-11-10T04:59:00Z', true], ['2026-11-10T05:00:00Z', false],
  ['2026-07-10T16:00:00Z', true], ['2026-12-04T16:00:00Z', true],
  ['2026-12-05T12:00:00Z', true],
 ])('quiet at %s', (date, expected) => expect(isQuiet(new Date(date))).toBe(expected));
 it('shows the recap on Friday afternoon, Saturday and Sunday morning only', () => {
  expect(isRecapTime(new Date('2026-12-04T13:30:00Z'))).toBe(true);
  expect(isRecapTime(new Date('2026-12-05T18:00:00Z'))).toBe(true);
  expect(isRecapTime(new Date('2026-12-06T09:00:00Z'))).toBe(true);
  expect(isRecapTime(new Date('2026-12-06T10:00:00Z'))).toBe(false);
 });
 it('counts the shared week including both people, excluding other weeks', () => {
  expect(weekCount([{completed_at:'2026-11-29T12:00:00Z'}, {completed_at:'2026-12-04T12:00:00Z'}, {completed_at:'2026-11-28T12:00:00Z'}], new Date('2026-12-06T09:00:00Z'))).toBe(2);
 });
});

import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup, act, fireEvent, render, screen } from '@testing-library/react';
import type { TaskRow } from '@/lib/types/database';
import { DayDone } from '../DayDone';
import { WeekTogether } from '../WeekTogether';
const mocks = vi.hoisted(() => ({ celebrate: vi.fn(), refetch: vi.fn(), completions: [] as { completed_at:string; user_id:string }[] }));
vi.mock('@/lib/safe-confetti', () => ({ fireCelebration: mocks.celebrate }));
vi.mock('@/components/v2/Illustration', () => ({ Illustration: () => <div data-testid="illustration" /> }));
vi.mock('@/hooks/useCompletions', () => ({useCompletions: () => ({completions:mocks.completions, refetch:mocks.refetch})}));
vi.mock('@/hooks/useCopy', () => ({useCopy: (copy: {he:Record<string,string>}) => ({c:(key:string, vars?:Record<string,string|number>) => copy.he[key].replace('{count}', String(vars?.count))})}));
const task = {id:'one', due_date:'2026-11-09', status:'pending', recurring:false} as unknown as TaskRow;
const props = {today:'2026-11-09', isCompletedToday: () => false};
describe('moments', () => {
 beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-09T10:00:00Z')); localStorage.clear(); mocks.celebrate.mockClear(); mocks.refetch.mockReset().mockResolvedValue(undefined); mocks.completions=[]; Object.defineProperty(window, 'matchMedia', { configurable:true, value:vi.fn().mockReturnValue({matches:false}) }); });
 afterEach(() => { cleanup(); vi.useRealTimers(); });
 it('waits for a confirmed final completion, dismisses on the next action and bursts once a day', async () => {
  const view = render(<DayDone {...props} tasks={[task]} pending={[]}/>);
  view.rerender(<DayDone {...props} tasks={[task]} pending={['one']}/>);
  expect(screen.queryByRole('status')).toBeNull();
  view.rerender(<DayDone {...props} tasks={[{...task,status:'completed'}]} pending={[]}/>);
  await act(async () => {});
  expect(screen.getByText('סגרנו את היום. כל הכבוד לנו.')).toBeTruthy();
  expect(mocks.celebrate).toHaveBeenCalledTimes(1);
  fireEvent.click(document.body); expect(screen.queryByRole('status')).toBeNull();
  view.rerender(<DayDone {...props} tasks={[task]} pending={['one']}/>);
  view.rerender(<DayDone {...props} tasks={[{...task,status:'completed'}]} pending={[]}/>);
  expect(mocks.celebrate).toHaveBeenCalledTimes(1);
 });
 it('does not celebrate a failed completion or a remaining task', () => {
  const view = render(<DayDone {...props} tasks={[task]} pending={['one']}/>);
  view.rerender(<DayDone {...props} tasks={[task]} pending={[]}/>);
  expect(screen.queryByRole('status')).toBeNull();
  view.rerender(<DayDone {...props} tasks={[task,{...task,id:'two'}]} pending={['one']}/>);
  view.rerender(<DayDone {...props} tasks={[{...task,status:'completed'},{...task,id:'two'}]} pending={[]}/>);
  expect(screen.queryByRole('status')).toBeNull();
 });
 it('uses text only for reduced motion', async () => {
  vi.mocked(window.matchMedia).mockReturnValue({matches:true} as MediaQueryList);
  const view = render(<DayDone {...props} tasks={[task]} pending={['one']}/>);
  view.rerender(<DayDone {...props} tasks={[{...task,status:'completed'}]} pending={[]}/>);
  await act(async () => {});
  expect(screen.getByRole('status')).toBeTruthy(); expect(screen.queryByTestId('illustration')).toBeNull(); expect(mocks.celebrate).not.toHaveBeenCalled();
 });
 it('shows shared totals without partner names and hides zero', () => {
  vi.setSystemTime(new Date('2026-12-06T09:00:00Z'));
  mocks.completions=[{completed_at:'2026-12-04T10:00:00Z',user_id:'Noa'},{completed_at:'2026-12-03T10:00:00Z',user_id:'Yoni'}];
  const view=render(<WeekTogether pending={[]}/>);
  expect(screen.getByText('השבוע סגרנו יחד 2 משימות.')).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/Noa|Yoni/);
  mocks.completions=[]; view.rerender(<WeekTogether pending={[]}/>); expect(screen.queryByText(/השבוע סגרנו/)).toBeNull();
 });
});
