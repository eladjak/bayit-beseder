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

import React, {useState} from 'react';
import {render, screen, renderHook, waitFor} from '@testing-library/react';
import {vi} from 'vitest';
const flag = vi.hoisted(() => ({value:null as boolean | null}));
vi.mock('@/hooks/useNewUi', () => ({useNewUi: () => flag.value}));
vi.mock('@/screens/stats/StatsV2', () => ({default: () => <p>V2 stats</p>}));
vi.mock('@/hooks/useTasks', () => ({useTasks: () => {useState(1); return {tasks:[],loading:true}}}));
vi.mock('@/hooks/useCompletions', () => ({useCompletions: () => ({completions:[],loading:true})}));
vi.mock('@/hooks/useCategories', () => ({useCategories: () => ({categoryMap:{}})}));
const fixture = vi.hoisted(() => ({profile: null as null | {household_id:string}, client: null as unknown}));
vi.mock('@/components/SupabaseProvider', () => ({useSupabase: () => fixture.client}));
vi.mock('@/hooks/useProfile', () => ({useProfile: () => ({profile:fixture.profile, loading:false, refetch:vi.fn()})}));
vi.mock('@/hooks/usePartner', () => ({usePartner: () => ({partner:{name:''}})}));
vi.mock('@/hooks/useHouseholdMembers', () => ({useHouseholdMembers: () => ({members:[]})}));
vi.mock('@/hooks/useSubscription', () => ({useSubscription: () => ({canUse:()=>false,loading:true})}));
vi.mock('@/hooks/useTranslation', () => ({useTranslation: () => ({t:(key:string)=>key})}));
vi.mock('@/hooks/useCopy', () => ({useCopy: () => ({c:(key:string)=>key})}));
import StatsPage from '@/app/(app)/stats/page';
it('renders V1 while unknown or off and can toggle without a hook-order error', () => {
 flag.value=null; const view=render(<StatsPage/>); expect(screen.queryByText('V2 stats')).toBeNull();
 flag.value=true; view.rerender(<StatsPage/>); expect(screen.getByText('V2 stats')).toBeTruthy();
 flag.value=false; view.rerender(<StatsPage/>); expect(screen.queryByText('V2 stats')).toBeNull();
});

import * as modelModule from '../useStatsModel';
const {default: StatsV2} = await vi.importActual<typeof import('../StatsV2')>('../StatsV2');
import {fireEvent} from '@testing-library/react';
it('shows fixture totals and charts, with no personal comparison, and changes period', () => {
 const model = vi.spyOn(modelModule, 'useStatsModel').mockReturnValue({loading:false,error:false,noHousehold:false,retry:vi.fn(),data:{total:2,days:[{label:'2026-11-11',value:2}],rooms:[{label:'Kitchen',value:2}]}});
 const view=render(<StatsV2/>);
 expect(view.container.textContent).toContain('2'); expect(screen.getByText('Kitchen')).toBeTruthy(); expect(view.container.textContent).not.toMatch(/Noa|Yoni|%/);
 fireEvent.click(screen.getByRole('button',{name:'month'})); expect(model).toHaveBeenLastCalledWith('month'); model.mockRestore();
});
it('shows honest empty and retry on error', () => {
 const model=vi.spyOn(modelModule,'useStatsModel').mockReturnValue({loading:false,error:false,noHousehold:false,retry:vi.fn(),data:{total:0,days:[],rooms:[]}});
 const view=render(<StatsV2/>); expect(screen.getByText('empty')).toBeTruthy();
 const retry=vi.fn(); model.mockReturnValue({loading:false,error:true,noHousehold:false,retry,data:null}); view.rerender(<StatsV2/>); fireEvent.click(screen.getByText('retry')); expect(retry).toHaveBeenCalledOnce(); model.mockRestore();
});

it('loads schema-correct shared categories and every completion beyond the row cap', async () => {
 const rows = Array.from({length:1001}, (_, i) => ({task_id:'a', completed_at:'2026-11-11T12:00:00Z', id:String(i)}));
 const calls: {table:string; filters:string[]; count?:string; from:number; to:number}[] = [];
 fixture.client = {from(table:string) {
  const call = {table, filters:[] as string[], count:undefined as string | undefined, from:0, to:999}; calls.push(call);
  const q = {select(_columns:string, options?:{count?:string}) { call.count=options?.count; return q; }, eq(column:string) {call.filters.push(column); return q;}, gte() {return q;}, lt() {return q;}, order() {return q;}, range(from:number,to:number) {call.from=from; call.to=to; return q;}, then(resolve:(value:unknown)=>void) {
   const error = table==='categories' && call.filters.some(c=>!['id','name','icon','color','created_at'].includes(c)) ? {message:'column categories.household_id does not exist'} : null;
   const data = table==='categories' ? [{id:'k',name:'Kitchen'}] : table==='tasks' ? [{id:'a',category_id:'k'}] : rows.slice(call.from,call.to+1);
   return Promise.resolve({data,error,count:table==='task_completions'?rows.length:null}).then(resolve);
  }}; return q;
 }};
 fixture.profile={household_id:'home'};
 const view=renderHook(() => modelModule.useStatsModel('week'));
 await waitFor(() => expect(view.result.current.loading).toBe(false));
 expect(view.result.current.error).toBe(false);
 expect(view.result.current.data?.total).toBe(1001);
 expect(view.result.current.data?.rooms).toEqual([{label:'Kitchen',value:1001}]);
 expect(calls.find(c=>c.table==='categories')?.filters).toEqual([]);
 expect(calls.filter(c=>c.table==='task_completions')[0].count).toBe('exact');
 view.unmount(); fixture.profile=null;
});
it('includes zero days and weekday labels for the full selected period', () => {
 const result = summarize([{task_id:'a',completed_at:'2026-11-10T12:00:00Z'}], [], [], {start:'2026-11-08',end:'2026-11-12'}, 'he');
 expect(result.days).toEqual([{label:'א׳',value:0},{label:'ב׳',value:0},{label:'ג׳',value:1},{label:'ד׳',value:0}]);
});
it('labels monthly chart days with calendar dates so repeated weekdays are distinguishable', () => {
 const result = summarize([{task_id:'a',completed_at:'2026-11-10T12:00:00Z'}], [], [], {start:'2026-11-01',end:'2026-11-10'}, 'en');
 expect(result.days[0].label).not.toEqual(result.days[7].label);
});
it('offers a next step when there are no completed tasks', () => {
 const model=vi.spyOn(modelModule,'useStatsModel').mockReturnValue({loading:false,error:false,noHousehold:false,retry:vi.fn(),data:{total:0,days:[],rooms:[]}});
 render(<StatsV2/>); expect(screen.getByText('emptyHint')).toBeTruthy(); model.mockRestore();
});
