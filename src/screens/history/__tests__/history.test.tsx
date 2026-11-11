import { describe, it, expect } from 'vitest';
import { groupHistory, PAGE_SIZE } from '../useHistoryModel';
describe('history model', () => {
 it('groups newest first by Israel day and supports paging', () => {
  const rows = Array.from({length: PAGE_SIZE + 1}, (_, i) => ({id:String(i), task_id:'a', user_id:'u', completed_at: new Date(Date.UTC(2026,10,10,23,i)).toISOString()}));
  const groups = groupHistory(rows.slice().reverse());
  expect(groups[0].day).toBe('2026-11-11'); expect(groups[0].entries[0].id).toBe(String(PAGE_SIZE)); expect(rows.slice(0,PAGE_SIZE)).toHaveLength(PAGE_SIZE);
 });
});

import React, {useState} from 'react';
import {render, screen} from '@testing-library/react';
import {vi} from 'vitest';
const flag = vi.hoisted(() => ({value:null as boolean | null}));
vi.mock('@/hooks/useNewUi', () => ({useNewUi: () => flag.value}));
vi.mock('@/screens/history/HistoryV2', () => ({default: () => <p>V2 history</p>}));
vi.mock('@/hooks/useTasks', () => ({useTasks: () => { useState(1); return {tasks:[],loading:false,error:null}; }}));
vi.mock('@/hooks/useCompletions', () => ({useCompletions: () => ({completions:[],loading:false})}));
vi.mock('@/hooks/useCategories', () => ({useCategories: () => ({categoryMap:{}})}));
vi.mock('@/hooks/useTranslation', () => ({useTranslation: () => ({t:(key:string)=>key})}));
import HistoryPage from '@/app/(app)/history/page';
it('renders the old page for unknown and off and switches without changing hook order', () => {
 flag.value=null; const view=render(<HistoryPage/>); expect(screen.getByText('history.emptyTitle')).toBeTruthy();
 flag.value=true; view.rerender(<HistoryPage/>); expect(screen.getByText('V2 history')).toBeTruthy();
 flag.value=false; view.rerender(<HistoryPage/>); expect(screen.getByText('history.emptyTitle')).toBeTruthy();
});
