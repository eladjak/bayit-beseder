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

import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { TemplatesSheet } from '../sheets/TemplatesSheet';
import { ReviewOldSheet } from '../sheets/ReviewOldSheet';
const mocks=vi.hoisted(()=>({notify:vi.fn(),add:vi.fn(),update:vi.fn(),remove:vi.fn(),verify:vi.fn()}));
vi.mock('@/components/v2/Sheet',()=>({Sheet:({children}:{children:React.ReactNode})=><div>{children}</div>}));
vi.mock('@/hooks/useTranslation',()=>({useTranslation:()=>({locale:'en'})}));
vi.mock('sonner',()=>({toast:Object.assign(mocks.notify,{error:vi.fn()})}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
it('creates selected template tasks before offering undo of exactly those IDs',async()=>{
 let resolve!:(v:unknown)=>void; const create=vi.fn().mockImplementationOnce(()=>new Promise(r=>{resolve=r})).mockImplementation(()=>Promise.resolve({id:`id-${create.mock.calls.length}`})); const remove=vi.fn().mockResolvedValue(true);
 render(<TemplatesSheet open onClose={()=>{}} createTask={create} deleteTask={remove} categories={[]} today="2026-11-11" userId="me"/>);
 fireEvent.click(screen.getByLabelText(/ניקיון יומי בסיסי/));expect(screen.getByText('שטיפת כלים')).toBeTruthy();fireEvent.click(screen.getByText('Add selected tasks'));expect(mocks.notify).not.toHaveBeenCalled();resolve({id:'id-1'});await vi.waitFor(()=>expect(mocks.notify).toHaveBeenCalled());const action=mocks.notify.mock.calls[0][1].action;action.onClick();await vi.waitFor(()=>expect(remove).toHaveBeenCalledTimes(5));expect(remove.mock.calls.map(c=>c[0])).toEqual(['id-1','id-2','id-3','id-4','id-5']);
});
it('reviews a stale task through update and waits for confirmation',async()=>{
 let resolve!:(v:boolean)=>void;const update=vi.fn(()=>new Promise<boolean>(r=>{resolve=r}));render(<ReviewOldSheet open onClose={()=>{}} tasks={[{id:'old',title:'Old',due_date:'2000-01-01',status:'pending'} as never]} updateTask={update} onDelete={()=>{}} today="2026-11-11"/>);fireEvent.click(screen.getByText('Do today'));expect(update).toHaveBeenCalledWith('old',{due_date:'2026-11-11'});expect(screen.queryByText('Task updated')).toBeNull();resolve(true);expect(await screen.findByText('Task updated')).toBeTruthy();
});
import { CategoriesSheet } from '../sheets/CategoriesSheet';
vi.mock('@/hooks/useTaskCategories',()=>({useTaskCategories:()=>({taskCategories:[{id:'c',name:'Kitchen',icon:'✨'}],loading:false,addTaskCategory:mocks.add,updateTaskCategory:mocks.update,deleteTaskCategory:mocks.remove,refetch:vi.fn()})}));
vi.mock('@/lib/supabase',()=>({createClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:mocks.verify})})})})}));
it('does not claim a rename succeeded if the server read disagrees',async()=>{mocks.update.mockResolvedValue(undefined);mocks.verify.mockResolvedValue({data:{name:'Kitchen'},error:null});render(<CategoriesSheet open onClose={()=>{}}/>);fireEvent.click(screen.getByText('Rename'));fireEvent.change(screen.getByLabelText('New name'),{target:{value:'New'}});fireEvent.click(screen.getByText('Save name'));expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('Saved')).toBeNull();expect(mocks.update).toHaveBeenCalledWith('c',{name:'New'});});
it('adds a category only after the existing helper confirms',async()=>{let resolve!:(v:{ok:boolean})=>void;mocks.add.mockReturnValue(new Promise(r=>{resolve=r}));render(<CategoriesSheet open onClose={()=>{}}/>);fireEvent.change(screen.getByLabelText('Category name'),{target:{value:'New'}});fireEvent.click(screen.getByText('Add category'));expect(screen.queryByText('Saved')).toBeNull();resolve({ok:true});expect(await screen.findByText('Saved')).toBeTruthy();});
it('does not claim a deletion succeeded if the server still has the category',async()=>{mocks.remove.mockResolvedValue(undefined);mocks.verify.mockResolvedValue({data:{id:'c',name:'Kitchen'},error:null});render(<CategoriesSheet open onClose={()=>{}}/>);fireEvent.click(screen.getByText('Delete'));fireEvent.click(screen.getByText('Confirm delete'));expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('Saved')).toBeNull();expect(mocks.remove).toHaveBeenCalledWith('c');});
it('reports a failed template batch without a success notification',async()=>{const create=vi.fn().mockResolvedValue(null);render(<TemplatesSheet open onClose={()=>{}} createTask={create} deleteTask={vi.fn()} categories={[]} today="2026-11-11" userId="me"/>);fireEvent.click(screen.getByLabelText(/ניקיון יומי בסיסי/));fireEvent.click(screen.getByText('Add selected tasks'));expect(await screen.findByRole('alert')).toBeTruthy();expect(mocks.notify).not.toHaveBeenCalled();});
it('reports a failed review update and leaves the task visible',async()=>{render(<ReviewOldSheet open onClose={()=>{}} tasks={[{id:'old',title:'Old',due_date:'2000-01-01',status:'pending'} as never]} updateTask={vi.fn().mockResolvedValue(false)} onDelete={()=>{}} today="2026-11-11"/>);fireEvent.click(screen.getByText('Next week'));expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.getByText('Old')).toBeTruthy();});
it('passes confirmed review deletion to the existing undo path',()=>{const remove=vi.fn();const task={id:'old',title:'Old',due_date:'2000-01-01',status:'pending'} as never;render(<ReviewOldSheet open onClose={()=>{}} tasks={[task]} updateTask={vi.fn()} onDelete={remove} today="2026-11-11"/>);fireEvent.click(screen.getByText('Delete'));expect(remove).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Confirm delete'));expect(remove).toHaveBeenCalledWith(task);});
