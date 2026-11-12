'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTasks } from '@/hooks/useTasks';
import { useCompletions } from '@/hooks/useCompletions';
import { useProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers';
import { useCopy } from '@/hooks/useCopy';
import { useTranslation } from '@/hooks/useTranslation';
import { isRecurring, isTaskOverdue } from '@/lib/task-flags';
import type { TaskRow as Task } from '@/lib/types/database';
import { Illustration } from '@/components/v2/Illustration';
import { TaskSheet } from './TaskSheet';
import { DayDone } from '@/components/v2/delight/DayDone';
import { WeekTogether } from '@/components/v2/delight/WeekTogether';
import copy from '@/lib/i18n/fragments/tasks';
import { TaskRow } from './TaskRow';
import { TaskGroup } from './TaskGroup';
import { TaskFilters } from './TaskFilters';
import { groupTasks, jerusalemDay, sortTasks, type TaskSort } from './useTasksModel';
import { CategoriesSheet } from './sheets/CategoriesSheet';
import { TemplatesSheet } from './sheets/TemplatesSheet';
import { SortSheet } from './sheets/SortSheet';
import { ReviewOldSheet } from './sheets/ReviewOldSheet';

export function TasksV2() {
 const { c } = useCopy(copy); const { locale } = useTranslation();
 const { profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile();
 const { tasks, loading, error, createTask, updateTask, deleteTask, refetch } = useTasks({ realtime:true });
 const { markComplete, undoComplete, isCompletedToday, refetch:refetchCompletions } = useCompletions({limit:500});
 const { categories } = useCategories();
 const today = jerusalemDay();
 const { members } = useHouseholdMembers(profile?.household_id, today);
 const [more, setMore] = useState(false); const [actionSheet,setActionSheet] = useState<'categories'|'templates'|'sort'|'review'|null>(null); const [sort,setSort] = useState<TaskSort>('due');
 const [filter, setFilter] = useState('all'); const [pending, setPending] = useState<string[]>([]); const [failed, setFailed] = useState<string[]>([]); const [sheet, setSheet] = useState<Task | 'new' | null>(null); const [hidden, setHidden] = useState<string[]>([]); const deletions = useRef(new Map<string, ReturnType<typeof setTimeout>>()); const deleteRef = useRef(deleteTask); deleteRef.current = deleteTask; const [offline, setOffline] = useState(false);
 useEffect(()=>{ try { setFilter(sessionStorage.getItem('tasks-v2-filter') || 'all'); const saved=sessionStorage.getItem('tasks-v2-sort'); if(saved==='due'||saved==='room'||saved==='who'||saved==='newest') setSort(saved); } catch {} const update=()=>setOffline(!navigator.onLine); update(); window.addEventListener('online',update); window.addEventListener('offline',update); return ()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}; },[]);
 function select(value:string) { setFilter(value); try { sessionStorage.setItem('tasks-v2-filter',value); } catch {} }
 const partner = members.find(m=>m.id !== profile?.id);
 const rooms = categories.filter(category=>tasks.some(t=>t.category_id===category.id));
 const choices = [{id:'all',label:c('all')},{id:'mine',label:c('mine')}, ...(partner ? [{id:`user:${partner.id}`,label:c('partner',{name:partner.name.split(' ')[0]})}] : []),{id:'shared',label:c('shared')},...rooms.map(r=>({id:`room:${r.id}`,label:r.name}))];
 const filtered = tasks.filter(t => !hidden.includes(t.id)).filter(t => filter==='all' || (filter==='mine' && t.assigned_to===profile?.id) || (filter==='shared' && !t.assigned_to) || filter===`user:${t.assigned_to}` || filter===`room:${t.category_id}`);
 const withCompletion = filtered.map(t=>isRecurring(t.recurring) && isCompletedToday(t.id) ? {...t,status:'completed' as const} : t);
 const groups = groupTasks(withCompletion); const roomLabels=Object.fromEntries(categories.map(r=>[r.id,r.name])); const memberLabels=Object.fromEntries(members.map(m=>[m.id,m.name])); for (const key of ['today','week','later','done'] as const) groups[key]=sortTasks(groups[key],sort,roomLabels,memberLabels);
 async function toggle(task:Task) {
  if (!profile || pending.includes(task.id)) return;
  setPending(p=>[...p,task.id]); setFailed(p=>p.filter(id=>id!==task.id));
  try {
   if (task.status==='completed') { if (!await undoComplete(task.id)) throw Error(); await Promise.all([refetch(),refetchCompletions()]); }
   else { const result = await markComplete({taskId:task.id,userId:profile.id,householdId:profile.household_id ?? undefined,recurring:isRecurring(task.recurring)}); if (!result || result.id.startsWith('offline-')) throw Error(); await refetch(); toast(c('complete'), {duration:5000, action:{label:c('undo'), onClick:()=>{void (async()=>{if(await undoComplete(task.id)) await Promise.all([refetch(),refetchCompletions()]); else toast.error(c('undoFailed'));})();}}}); }
  } catch {setFailed(p=>[...p,task.id]);} finally {setPending(p=>p.filter(id=>id!==task.id));}
 }
 function flush(id:string) { const timer=deletions.current.get(id); if(!timer) return; clearTimeout(timer); deletions.current.delete(id); void deleteRef.current(id).then(ok=>{if(!ok){setHidden(h=>h.filter(x=>x!==id));toast.error(c('deleteError'));}}); }
 function scheduleDelete(task:Task) { setHidden(h=>[...h,task.id]); const timer=setTimeout(()=>flush(task.id),5000); deletions.current.set(task.id,timer); toast(c('deleted'),{duration:5000,actionButtonStyle:{minHeight:'44px',minWidth:'44px'},action:{label:c('undo'),onClick:()=>{const pending=deletions.current.get(task.id); if(pending){clearTimeout(pending);deletions.current.delete(task.id);setHidden(h=>h.filter(id=>id!==task.id));}}}}); }
 useEffect(()=>{const map=deletions.current; const flushAll=()=>{for(const id of map.keys()) flush(id)}; const visibility=()=>{if(document.visibilityState==='hidden') flushAll()}; window.addEventListener('pagehide',flushAll); document.addEventListener('visibilitychange',visibility); return ()=>{window.removeEventListener('pagehide',flushAll);document.removeEventListener('visibilitychange',visibility);flushAll()};},[]);
 function dateLabel(date:string|null) { if(!date) return c('unspecified'); if(date===today) return c('today'); const next = new Date(`${today}T12:00:00Z`); next.setUTCDate(next.getUTCDate()+1); if(date===next.toISOString().slice(0,10)) return c('tomorrow'); return new Intl.DateTimeFormat(locale==='en'?'en-US':'he-IL',{weekday:'long', day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)); }
 function row(task:Task) { const name = task.assigned_to ? (members.find(m=>m.id===task.assigned_to)?.name ?? (task.assigned_to===profile?.id ? profile.name : c('member'))) : c('shared'); return <TaskRow key={task.id} task={task} name={name} room={categories.find(r=>r.id===task.category_id)?.name} when={dateLabel(task.due_date)} pending={pending.includes(task.id)} failed={failed.includes(task.id)} onToggle={()=>void toggle(task)} onEdit={()=>setSheet(task)} overdue={isTaskOverdue(task,today)} overdueLabel={c('overdue')} retry={`${c('failed')} ${c('retry')}`}/>; }
 return <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 text-bb-ink"><h1 className="text-3xl font-bold">{c('title')}</h1><p className="mb-5 mt-2">{c('instruction')}</p>{offline && <p role="status" className="mb-4 rounded bg-bb-honey-50 p-4">{c('offline')}</p>}
 {profileLoading || loading ? <p role="status">{c('loading')}</p> : profileError ? <div role="alert"><p>{c('error')}</p><button className="min-h-11 underline" onClick={()=>void refetchProfile()}>{c('retry')}</button></div> : !profile?.household_id ? <div><p>{c('noHousehold')}</p><Link className="inline-flex min-h-11 items-center underline" href="/settings">{c('settings')}</Link></div> : error ? <div role="alert"><p>{c('error')}</p><button className="min-h-11 underline" onClick={()=>void refetch()}>{c('retry')}</button></div> : <>
 <div className="mb-3"><button type="button" aria-expanded={more} className="min-h-11 rounded-bb-md border border-bb-line-strong px-4" onClick={()=>setMore(!more)}>{locale==='en'?'More actions':'עוד פעולות'}</button>{more&&<div className="mt-2 flex flex-wrap gap-2">{([['categories','קטגוריות','Categories'],['templates','תבניות','Templates'],['sort','מיון','Sort'],['review','בדיקת משימות ישנות','Review old tasks']] as const).map(([id,he,en])=><button key={id} className="min-h-11 rounded-bb-md border border-bb-line-strong px-4" onClick={()=>{setActionSheet(id);setMore(false)}}>{locale==='en'?en:he}</button>)}</div>}</div>
 <button type="button" className="min-h-11 w-full rounded-bb-md border border-bb-line-strong bg-bb-card px-4 text-start" onClick={()=>setSheet('new')}>{c('add')} · {c('example')}</button>
 {tasks.length===0 ? <div className="mx-auto mt-8 max-w-64 text-center"><Illustration id="emptyTasks" sizes="256px" decorative/><p>{c('empty')}</p></div> : <div className="mt-6"><TaskFilters choices={choices} value={filter} onChange={select}/>{filtered.length===0 ? <div className="mt-8"><p>{c('emptyFilter')}</p><button className="min-h-11 underline" onClick={()=>select('all')}>{c('showAll')}</button></div> : (['today','week','later','done'] as const).map(key=>groups[key].length>0 && <TaskGroup key={key} title={c(key)} folded={key==='done'}>{groups[key].map(row)}</TaskGroup>)}</div>}
 <DayDone tasks={tasks} pending={pending} isCompletedToday={isCompletedToday} today={today}/><WeekTogether pending={pending}/></>}
 {actionSheet==='categories' && <CategoriesSheet open onClose={()=>setActionSheet(null)}/>}
 {actionSheet==='templates' && profile && <TemplatesSheet open onClose={()=>setActionSheet(null)} createTask={createTask} deleteTask={deleteTask} categories={categories} today={today} userId={profile.id}/>}
 {actionSheet==='sort' && <SortSheet open onClose={()=>setActionSheet(null)} value={sort} onChange={value=>{setSort(value);try{sessionStorage.setItem('tasks-v2-sort',value)}catch{}}}/>}
 {actionSheet==='review' && <ReviewOldSheet open onClose={()=>setActionSheet(null)} tasks={tasks.filter(t=>!hidden.includes(t.id))} updateTask={updateTask} onDelete={scheduleDelete} today={today}/>}
 <TaskSheet open={sheet!==null} task={sheet==='new'?null:sheet} today={today} members={members} categories={categories} onClose={()=>setSheet(null)} onSave={async data=>{const ok=sheet==='new' ? !!await createTask({...data,title:data.title ?? '',status:'pending',points:10}) : sheet ? await updateTask(sheet.id,data) : false; if(ok) { await refetch(); toast(sheet==='new'?c('saved'):c('edited')); } return ok;}} onDelete={()=>{if(sheet && sheet!=='new') scheduleDelete(sheet); setSheet(null);}} /></main>;
}
