'use client';
import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTasks } from '@/hooks/useTasks';
import { useCompletions } from '@/hooks/useCompletions';
import { useProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers';
import { useCopy } from '@/hooks/useCopy';
import { useTranslation } from '@/hooks/useTranslation';
import { isRecurring } from '@/lib/task-flags';
import type { TaskRow as Task } from '@/lib/types/database';
import { QuickAdd } from '@/components/v2/QuickAdd';
import { Illustration } from '@/components/v2/Illustration';
import { Dialog } from '@/components/v2/Dialog';
import copy from '@/lib/i18n/fragments/tasks';
import { TaskRow } from './TaskRow';
import { TaskGroup } from './TaskGroup';
import { TaskFilters } from './TaskFilters';
import { groupTasks, jerusalemDay } from './useTasksModel';

function VirtualRows({ tasks, render }: { tasks:Task[]; render:(task:Task)=>React.ReactNode }) {
 const ref = useRef<HTMLDivElement>(null);
 const virtual = useVirtualizer({ count:tasks.length, getScrollElement:()=>ref.current, estimateSize:()=>100, overscan:5 });
 return <li><div ref={ref} className="max-h-[600px] overflow-y-auto"><div style={{height:virtual.getTotalSize(), position:'relative'}}>{virtual.getVirtualItems().map(item=><div key={tasks[item.index].id} data-index={item.index} ref={virtual.measureElement} style={{position:'absolute', top:0, left:0, width:'100%', transform:`translateY(${item.start}px)`}}><ul>{render(tasks[item.index])}</ul></div>)}</div></div></li>;
}
export function TasksV2() {
 const { c } = useCopy(copy); const { locale } = useTranslation();
 const { profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile();
 const { tasks, loading, error, createTask, deleteTask, refetch } = useTasks({ realtime:true });
 const { markComplete, undoComplete, isCompletedToday, refetch:refetchCompletions } = useCompletions({limit:500});
 const { categories } = useCategories();
 const today = jerusalemDay();
 const { members } = useHouseholdMembers(profile?.household_id, today);
 const [filter, setFilter] = useState('all'); const [pending, setPending] = useState<string[]>([]); const [failed, setFailed] = useState<string[]>([]); const [deleting, setDeleting] = useState<Task | null>(null); const [offline, setOffline] = useState(false);
 useEffect(()=>{ try { setFilter(sessionStorage.getItem('tasks-v2-filter') || 'all'); } catch {} const update=()=>setOffline(!navigator.onLine); update(); window.addEventListener('online',update); window.addEventListener('offline',update); return ()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}; },[]);
 function select(value:string) { setFilter(value); try { sessionStorage.setItem('tasks-v2-filter',value); } catch {} }
 const partner = members.find(m=>m.id !== profile?.id);
 const rooms = categories.filter(category=>tasks.some(t=>t.category_id===category.id));
 const choices = [{id:'all',label:c('all')},{id:'mine',label:c('mine')}, ...(partner ? [{id:`user:${partner.id}`,label:c('partner',{name:partner.name.split(' ')[0]})}] : []),{id:'shared',label:c('shared')},...rooms.map(r=>({id:`room:${r.id}`,label:r.name}))];
 const filtered = tasks.filter(t => filter==='all' || (filter==='mine' && t.assigned_to===profile?.id) || (filter==='shared' && !t.assigned_to) || filter===`user:${t.assigned_to}` || filter===`room:${t.category_id}`);
 const withCompletion = filtered.map(t=>isRecurring(t.recurring) && isCompletedToday(t.id) ? {...t,status:'completed' as const} : t);
 const groups = groupTasks(withCompletion);
 async function toggle(task:Task) {
  if (!profile || pending.includes(task.id)) return;
  setPending(p=>[...p,task.id]); setFailed(p=>p.filter(id=>id!==task.id));
  try {
   if (task.status==='completed') { if (!await undoComplete(task.id)) throw Error(); await Promise.all([refetch(),refetchCompletions()]); }
   else { const result = await markComplete({taskId:task.id,userId:profile.id,householdId:profile.household_id ?? undefined,recurring:isRecurring(task.recurring)}); if (!result || result.id.startsWith('offline-')) throw Error(); await refetch(); toast(c('complete'), {duration:5000, action:{label:c('undo'), onClick:()=>{void (async()=>{if(await undoComplete(task.id)) await Promise.all([refetch(),refetchCompletions()]); else toast.error(c('undoFailed'));})();}}}); }
  } catch {setFailed(p=>[...p,task.id]);} finally {setPending(p=>p.filter(id=>id!==task.id));}
 }
 function dateLabel(date:string|null) { if(!date) return c('unspecified'); if(date===today) return c('today'); const next = new Date(`${today}T12:00:00Z`); next.setUTCDate(next.getUTCDate()+1); if(date===next.toISOString().slice(0,10)) return c('tomorrow'); return new Intl.DateTimeFormat(locale==='en'?'en-US':'he-IL',{weekday:'long', day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)); }
 function row(task:Task) { const name = task.assigned_to ? (members.find(m=>m.id===task.assigned_to)?.name ?? (task.assigned_to===profile?.id ? profile.name : c('member'))) : c('shared'); return <TaskRow key={task.id} task={task} name={name} room={categories.find(r=>r.id===task.category_id)?.name} when={dateLabel(task.due_date)} pending={pending.includes(task.id)} failed={failed.includes(task.id)} onToggle={()=>void toggle(task)} onDelete={()=>setDeleting(task)} menu={c('menu')} remove={c('delete')} retry={`${c('failed')} ${c('retry')}`}/>; }
 return <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 text-bb-ink"><h1 className="text-3xl font-bold">{c('title')}</h1><p className="mb-5 mt-2">{c('instruction')}</p>{offline && <p role="status" className="mb-4 rounded bg-bb-honey-50 p-4">{c('offline')}</p>}
 {profileLoading || loading ? <p role="status">{c('loading')}</p> : profileError ? <div role="alert"><p>{c('error')}</p><button className="min-h-11 underline" onClick={()=>void refetchProfile()}>{c('retry')}</button></div> : !profile?.household_id ? <div><p>{c('noHousehold')}</p><Link className="inline-flex min-h-11 items-center underline" href="/settings">{c('settings')}</Link></div> : error ? <div role="alert"><p>{c('error')}</p><button className="min-h-11 underline" onClick={()=>void refetch()}>{c('retry')}</button></div> : <>
 <QuickAdd label={c('add')} placeholder={c('placeholder')} submitLabel={c('add')} errorMessage={c('addError')} savedMessage={c('saved')} onSubmit={async title=>await createTask({title,assigned_to:profile.id,status:'pending',due_date:today,points:10,recurring:false}) ? {ok:true} : {ok:false,message:c('addError')}} />
 {tasks.length===0 ? <div className="mx-auto mt-8 max-w-64 text-center"><Illustration id="emptyTasks" sizes="256px" decorative/><p>{c('empty')}</p></div> : <div className="mt-6"><TaskFilters choices={choices} value={filter} onChange={select}/>{filtered.length===0 ? <div className="mt-8"><p>{c('emptyFilter')}</p><button className="min-h-11 underline" onClick={()=>select('all')}>{c('showAll')}</button></div> : (['today','week','later','done'] as const).map(key=>groups[key].length>0 && <TaskGroup key={key} title={c(key)} folded={key==='done'}>{tasks.length>60 ? <VirtualRows tasks={groups[key]} render={row}/> : groups[key].map(row)}</TaskGroup>)}</div>}</>}
 <Dialog open={!!deleting} title={c('confirm')} onClose={()=>setDeleting(null)}><div className="mt-4 flex gap-3"><button className="min-h-11 rounded bg-bb-primary px-4 text-bb-on-primary" onClick={()=>{if(deleting) void deleteTask(deleting.id).then(ok=>{if(!ok) toast.error(c('deleteError')); setDeleting(null);});}}>{c('delete')}</button><button className="min-h-11 px-4" onClick={()=>setDeleting(null)}>{c('cancel')}</button></div></Dialog></main>;
}
