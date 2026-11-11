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
import {render, screen} from '@testing-library/react';
import {vi} from 'vitest';
const flag = vi.hoisted(() => ({value:null as boolean | null}));
vi.mock('@/hooks/useNewUi', () => ({useNewUi: () => flag.value}));
vi.mock('@/screens/stats/StatsV2', () => ({default: () => <p>V2 stats</p>}));
vi.mock('@/hooks/useTasks', () => ({useTasks: () => {useState(1); return {tasks:[],loading:true}}}));
vi.mock('@/hooks/useCompletions', () => ({useCompletions: () => ({completions:[],loading:true})}));
vi.mock('@/hooks/useCategories', () => ({useCategories: () => ({categoryMap:{}})}));
vi.mock('@/hooks/useProfile', () => ({useProfile: () => ({profile:null})}));
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
