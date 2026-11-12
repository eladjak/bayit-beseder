import { describe, expect, it } from 'vitest';
import { groupTasks } from '../useTasksModel';

describe('Jerusalem task grouping', () => {
  it('sorts overdue first and respects Saturday night in Jerusalem', () => {
    const tasks = [
      { id: 'today', due_date: '2026-12-05', status: 'pending' },
      { id: 'old', due_date: '2026-12-01', status: 'pending' },
      { id: 'sun', due_date: '2026-12-06', status: 'pending' },
      { id: 'done', due_date: null, status: 'completed' },
    ];
    const groups = groupTasks(tasks, new Date('2026-12-05T21:30:00Z'));
    expect(groups.today.map(t => t.id)).toEqual(['old', 'today']);
    expect(groups.later.map(t => t.id)).toEqual(['sun']);
    expect(groups.done.map(t => t.id)).toEqual(['done']);
  });
});

import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { TasksV2 } from '../TasksV2';
const mocks = vi.hoisted(() => ({ mark:vi.fn(), undo:vi.fn(), toast:vi.fn(), refetch:vi.fn(), flag:null as boolean | null, tasks:[] as Record<string, unknown>[] }));
vi.mock('@/hooks/useTasks',()=>({useTasks:()=>({tasks:mocks.tasks,loading:false,error:null,createTask:vi.fn(),deleteTask:vi.fn(),refetch:mocks.refetch})}));
vi.mock('@/hooks/useProfile',()=>({useProfile:()=>({profile:{id:'me',name:'Me',household_id:'home'},loading:false})}));
vi.mock('@/hooks/useCompletions',()=>({useCompletions:()=>({markComplete:mocks.mark,undoComplete:mocks.undo,isCompletedToday:()=>false,refetch:mocks.refetch})}));
vi.mock('@/hooks/useCategories',()=>({useCategories:()=>({categories:[],categoryMap:{}})}));
vi.mock('@/hooks/useHouseholdMembers',()=>({useHouseholdMembers:()=>({members:[{id:'me',name:'Me'},{id:'partner',name:'Noa Cohen'}]})}));
vi.mock('@/hooks/useTranslation',()=>({useTranslation:()=>({locale:'he',t:(key:string)=>key})}));
vi.mock('@/hooks/useCopy',()=>({useCopy:(fragment:{he:Record<string,string>})=>({c:(key:string,vars?:Record<string,string>)=>Object.entries(vars??{}).reduce((s,[k,v])=>s.replace(`{${k}}`,v),fragment.he[key])})}));
vi.mock('sonner',()=>({toast:Object.assign(mocks.toast,{error:vi.fn()})}));
vi.mock('@/components/v2/QuickAdd',()=>({QuickAdd:()=>null}));
vi.mock('@/components/v2/Illustration',()=>({Illustration:()=>null}));
vi.mock('@/components/v2/Dialog',()=>({Dialog:()=>null}));

describe('task interactions',()=>{
 beforeEach(()=>{sessionStorage.clear(); vi.clearAllMocks(); mocks.refetch.mockResolvedValue(undefined); mocks.tasks=[{id:'a',title:'Wash',assigned_to:'me',category_id:null,due_date:null,status:'pending',recurring:true},{id:'b',title:'Cook',assigned_to:'partner',category_id:null,due_date:null,status:'pending',recurring:false}];});
 afterEach(cleanup);
 it('filters tasks and remembers selection',()=>{render(<TasksV2/>); fireEvent.click(screen.getByRole('button',{name:'שלי'})); expect(screen.getByText('Wash')).toBeTruthy(); expect(screen.queryByText('Cook')).toBeNull(); expect(sessionStorage.getItem('tasks-v2-filter')).toBe('mine');});
 it('waits for confirmation before toast and undo uses the task id',async()=>{let resolve!:(v:unknown)=>void; mocks.mark.mockReturnValue(new Promise(r=>{resolve=r})); mocks.undo.mockResolvedValue(true); render(<TasksV2/>); fireEvent.click(screen.getByRole('checkbox',{name:'סימון כבוצע: Wash'})); expect(mocks.mark).toHaveBeenCalledWith(expect.objectContaining({taskId:'a',recurring:true})); expect(mocks.toast).not.toHaveBeenCalled(); resolve({id:'completion'}); await waitFor(()=>expect(mocks.toast).toHaveBeenCalled()); const options=mocks.toast.mock.calls[0][1]; options.action.onClick(); await waitFor(()=>expect(mocks.undo).toHaveBeenCalledWith('a'));});
 it('shows retry and no success on failure',async()=>{mocks.mark.mockResolvedValue(null); render(<TasksV2/>); fireEvent.click(screen.getByRole('checkbox',{name:'סימון כבוצע: Wash'})); expect(await screen.findByText(/לא הצלחנו להשלים/)).toBeTruthy(); expect(mocks.toast).not.toHaveBeenCalled();});
 it('offers show all for an empty filter',()=>{render(<TasksV2/>); fireEvent.click(screen.getByRole('button',{name:'שלנו'})); expect(screen.getByText('אין משימות כאן')).toBeTruthy(); fireEvent.click(screen.getByRole('button',{name:'הצג הכול'})); expect(screen.getByText('Wash')).toBeTruthy();});
 it('shows the empty task message',()=>{mocks.tasks=[]; render(<TasksV2/>); expect(screen.getByText('אין עדיין משימות. אפשר להוסיף משימה למעלה.')).toBeTruthy();});
});

vi.mock('@/hooks/useNewUi',()=>({useNewUi:()=>mocks.flag}));
vi.mock('@/hooks/useTaskCategories',()=>({useTaskCategories:()=>({taskCategories:[]})}));
vi.mock('@/hooks/useTaskStreaks',()=>({useTaskStreaks:()=>({getStreak:()=>0})}));
vi.mock('@/hooks/useTaskPhoto',()=>({useTaskPhoto:()=>({uploadPhoto:vi.fn()})}));
vi.mock('@/hooks/useFirstVisit',()=>({useFirstVisit:()=>({isFirstVisit:false,dismiss:vi.fn()})}));

it('switches null to v2 to v1 without changing hook order', async()=>{
 const {default:Page}=await import('@/app/(app)/tasks/page');
 mocks.flag=null; mocks.tasks=[]; const errors=vi.spyOn(console,'error').mockImplementation(()=>{});
 const view=render(<Page/>); expect(screen.queryByText('מה צריך לעשות בבית?')).toBeNull();
 mocks.flag=true; view.rerender(<Page/>); expect(screen.getByText('מה צריך לעשות בבית?')).toBeTruthy();
 mocks.flag=false; view.rerender(<Page/>); expect(screen.queryByText('מה צריך לעשות בבית?')).toBeNull();
 expect(errors.mock.calls.flat().join(' ')).not.toMatch(/order of Hooks|Rendered (more|fewer) hooks/i); errors.mockRestore(); cleanup();
});
