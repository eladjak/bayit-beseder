import { describe, it, expect } from 'vitest';
import { weekDays } from '../useWeeklyModel';

describe('Israel week', () => {
  it('keeps late Saturday in the current Sunday to Saturday week', () => {
    expect(weekDays(new Date('2026-11-07T21:30:00Z'))).toEqual(['2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07']);
  });
  it('handles a December week across a year boundary', () => {
    expect(weekDays(new Date('2026-12-31T12:00:00Z'))).toEqual(['2026-12-27','2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02']);
  });
});

import React from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WeeklyV2 from '../WeeklyV2';
const mock = vi.hoisted(() => ({mark:vi.fn(), undo:vi.fn(), update:vi.fn(), generate:vi.fn(), refetch:vi.fn(), toast:vi.fn(), task:{id:"",title:"",due_date:"",status:"",recurring:false,assigned_to:"",category_id:null as string | null}}));
vi.mock('@/hooks/useTasks', () => ({useTasks:() => ({tasks:[mock.task],loading:false,error:null,updateTask:mock.update,refetch:mock.refetch})}));
vi.mock('@/hooks/useCompletions', () => ({useCompletions:() => ({loading:false,error:null,markComplete:mock.mark,undoComplete:mock.undo,refetch:mock.refetch,isCompletedToday:()=>false})}));
vi.mock('@/hooks/useProfile', () => ({useProfile:() => ({profile:{id:'me',name:'Me',household_id:'house'},loading:false,error:null,refetch:mock.refetch})}));
vi.mock('@/hooks/useHouseholdMembers', () => ({useHouseholdMembers:() => ({members:[{id:'partner',name:'Dana'}]})}));
vi.mock('@/hooks/useCategories', () => ({useCategories:() => ({categoryMap:{}})}));
vi.mock('@/hooks/useSubscription', () => ({useSubscription:() => ({canUse:()=>true})}));
vi.mock('@/hooks/useWeeklyGenerator', () => ({useWeeklyGenerator:() => ({plan:null,state:'idle',generate:mock.generate,reset:vi.fn()})}));
vi.mock('@/hooks/useCopy', async () => ({useCopy:() => ({c:(key:string) => {const copy:Record<string,string>={title:'Our week',moving:'Move task',move:'Move to a day',done:'Task completed',moved:'Task moved',undo:'Undo',failed:'Try again',retry:'Retry',generate:'Suggest a plan',makePlan:'Prepare suggestions',shared:'Ours',room:'General',unknown:'Member',progress:'Together'}; return copy[key] ?? key;}})}));
vi.mock('@/hooks/useTranslation', () => ({useTranslation:() => ({locale:'en',t:(key:string)=>key})}));
vi.mock('@/components/v2/Dialog', () => ({Dialog:({open,children}:{open:boolean,children:React.ReactNode}) => open ? <div role="dialog">{children}</div> : null}));
vi.mock('sonner', () => ({toast:Object.assign(mock.toast,{error:vi.fn(),success:vi.fn()})}));

describe('weekly interactions', () => {
 beforeEach(() => {vi.clearAllMocks(); mock.task={id:'task-1',title:'Clean',due_date:weekDays()[new Date(`${new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date())}T00:00:00Z`).getUTCDay()],status:'pending',recurring:false,assigned_to:'partner',category_id:null}; mock.refetch.mockResolvedValue(undefined); mock.mark.mockResolvedValue({id:'confirmed'}); mock.undo.mockResolvedValue(true); mock.update.mockResolvedValue(true);});
 afterEach(cleanup);
 it('completes via the real completion hook and offers undo', async () => {render(<WeeklyV2/>); fireEvent.click(screen.getByRole('checkbox')); await waitFor(()=>expect(mock.mark).toHaveBeenCalledWith({taskId:'task-1',userId:'me',recurring:false})); await waitFor(()=>expect(mock.toast).toHaveBeenCalled()); mock.toast.mock.calls[0][1].action.onClick(); await waitFor(()=>expect(mock.undo).toHaveBeenCalledWith('task-1'));});
 it('moves with the accessible menu and undo restores its date', async () => {render(<WeeklyV2/>); fireEvent.click(screen.getByRole('button',{name:'Move task'})); const destination=weekDays().find(day=>day!==mock.task.due_date)!; const label=new Intl.DateTimeFormat('en-US',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${destination}T12:00:00Z`)); fireEvent.click(screen.getByRole('button',{name:label})); await waitFor(()=>expect(mock.update).toHaveBeenCalledWith('task-1',{due_date:destination})); await waitFor(()=>expect(mock.toast).toHaveBeenCalled()); mock.toast.mock.calls[0][1].action.onClick(); await waitFor(()=>expect(mock.update).toHaveBeenCalledWith('task-1',{due_date:mock.task.due_date}));});
 it('does not generate on load or when opening the dialog', () => {render(<WeeklyV2/>); expect(mock.generate).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Suggest a plan')); expect(mock.generate).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Prepare suggestions')); expect(mock.generate).toHaveBeenCalledOnce();});
 it('shows a failed completion on its row and retries it', async () => {mock.mark.mockResolvedValueOnce(null); render(<WeeklyV2/>); fireEvent.click(screen.getByRole('checkbox')); expect(await screen.findByRole('alert')).toBeTruthy(); fireEvent.click(screen.getByText('Retry')); await waitFor(()=>expect(mock.mark).toHaveBeenCalledTimes(2));});
 it('shows the person without a personal count or comparison', () => {const {container}=render(<WeeklyV2/>); expect(screen.getByText('Dana')).toBeTruthy(); expect(container.textContent).not.toMatch(/Dana\s*\d/);});
});

vi.mock('@/hooks/useNewUi', () => ({useNewUi:() => flag.value}));
const flag = vi.hoisted(() => ({value:null as boolean | null}));
vi.mock('@/hooks/useZoneConfig', () => ({useZoneConfig:() => ({zoneMappings:[],zoneMode:false,zoneDaySummary:[],toggleZoneMode:vi.fn(),moveZone:vi.fn()})}));
vi.mock('@/hooks/usePartner', () => ({usePartner:() => ({partner:null})}));
vi.mock('@/hooks/useCalendarEvents', () => ({useCalendarEvents:() => ({events:[],eventsByDate:new Map(),loading:false,connected:false})}));
vi.mock('@/components/weekly/weekly-header', () => ({WeeklyHeader:() => <div data-testid="legacy-week"/>}));
vi.mock('@/components/weekly/weekly-day-card', () => ({WeeklyDayCard:() => null}));
vi.mock('@/components/weekly/weekly-smart-suggestions', () => ({WeeklySmartSuggestions:() => null}));
vi.mock('@/components/weekly/weekly-zone-panel', () => ({WeeklyZonePanel:() => null}));
vi.mock('@/components/weekly/weekly-stats', () => ({WeeklyStats:() => null}));
vi.mock('next/dynamic', () => ({default:() => () => null}));
import WeeklyPage from '@/app/(app)/weekly/page';
it('renders the legacy view for unknown and off, and switches without hook errors', () => {
 flag.value=null; mock.task={id:'task-1',title:'Clean',due_date:weekDays()[0],status:'pending',recurring:false,assigned_to:'partner',category_id:null};
 const view=render(<WeeklyPage/>); expect(screen.getByTestId('legacy-week')).toBeTruthy();
 flag.value=true; view.rerender(<WeeklyPage/>); expect(screen.getByText('Our week')).toBeTruthy();
 flag.value=false; view.rerender(<WeeklyPage/>); expect(screen.getByTestId('legacy-week')).toBeTruthy(); cleanup();
});

describe('weekly polish', () => {
 beforeEach(() => {mock.task={id:'task-1',title:'Clean',due_date:weekDays()[0],status:'pending',recurring:false,assigned_to:'partner',category_id:null};});
 afterEach(cleanup);
 it('uses a compact button to reveal the move choices', () => {render(<WeeklyV2/>); expect(screen.getByRole('button',{name:'Move task'})).toBeTruthy(); expect(screen.queryByRole('combobox')).toBeNull();});
 it('shows short weekday labels with dates and task counts', () => {render(<WeeklyV2/>); expect(screen.getByRole('button',{name:/Sun.*1 task/})).toBeTruthy();});
 it('provides an accessible weekly progress indicator', () => {render(<WeeklyV2/>); expect(screen.getByRole('progressbar').getAttribute('aria-valuemax')).toBe('1');});
 it('keeps desktop day columns wide enough for readable cards', () => {const {container}=render(<WeeklyV2/>); expect(container.querySelector('.md\\:min-w-\\[180px\\]')).toBeTruthy();});
});
