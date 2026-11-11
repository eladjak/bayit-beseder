'use client';
import { GripVertical, CalendarDays } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { useTasks } from '@/hooks/useTasks';
import { useCompletions } from '@/hooks/useCompletions';
import { useProfile } from '@/hooks/useProfile';
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers';
import { useCategories } from '@/hooks/useCategories';
import { useWeeklyGenerator } from '@/hooks/useWeeklyGenerator';
import { useSubscription } from '@/hooks/useSubscription';
import { useCopy } from '@/hooks/useCopy';
import { useTranslation } from '@/hooks/useTranslation';
import { ilToday } from '@/lib/il-date';
import { isRecurring } from '@/lib/task-flags';
import type { TaskRow } from '@/lib/types/database';
import { CATEGORY_NAME_TO_KEY, type CategoryKey } from '@/lib/categories';
import { Check } from '@/components/v2/Check';
import { AvatarChip } from '@/components/v2/AvatarChip';
import { RoomMark } from '@/components/v2/RoomMark';
import { Dialog } from '@/components/v2/Dialog';
import { toast } from 'sonner';
import copy from '@/lib/i18n/fragments/weekly';
import { weekDays } from './useWeeklyModel';

const button = 'min-h-11 rounded-bb-md px-4 font-semibold text-bb-primary hover:bg-bb-primary-50 focus-visible:outline-2 focus-visible:outline-bb-primary';
function Draggable({ task, children }: {task: TaskRow; children: React.ReactNode}) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({id: task.id});
  return <div ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined, opacity: isDragging ? .5 : 1 }} className="rounded-bb-md border border-bb-line bg-bb-card p-3 shadow-bb-1 md:p-1"><div {...listeners} {...attributes} className="hidden min-h-11 min-w-11 cursor-grab touch-none items-center justify-center text-bb-ink-2 md:flex" aria-label={task.title}><GripVertical size={20} aria-hidden="true" /></div>{children}</div>;
}
function DropDay({ date, children }: {date:string; children:React.ReactNode}) {
  const {setNodeRef, isOver} = useDroppable({id:date});
  return <section ref={setNodeRef} className={`min-w-0 rounded-bb-md p-3 md:p-2 ${isOver ? 'bg-bb-primary-50' : 'bg-bb-card'}`}>{children}</section>;
}
export default function WeeklyV2() {
  const { c } = useCopy(copy); const {locale} = useTranslation();
  const {profile, loading:profileLoading, error:profileError, refetch:refetchProfile} = useProfile();
  const {tasks, loading, error, updateTask, refetch} = useTasks({});
  const completions = useCompletions({limit:500});
  const {members} = useHouseholdMembers(profile?.household_id, ilToday());
  const {categoryMap} = useCategories();
  const wizard = useWeeklyGenerator(); const {canUse} = useSubscription(profile?.household_id ?? null);
  const days = useMemo(() => weekDays(), []); const today = ilToday();
  const [selected, setSelected] = useState(() => Math.max(0, days.indexOf(today)));
  const [moveOpen, setMoveOpen] = useState<string | null>(null);
  const [offline, setOffline] = useState(false); const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState<string[]>([]); const [errors, setErrors] = useState<Record<string, string>>({}); const [retryMove, setRetryMove] = useState<Record<string, string>>({});
  const weekStrip = useRef<HTMLDivElement>(null);
  useEffect(() => { if (weekStrip.current && window.matchMedia?.('(min-width: 768px)').matches) { const day = weekStrip.current.querySelector<HTMLElement>('[data-today="true"]'); if (day) weekStrip.current.scrollLeft = day.offsetLeft - weekStrip.current.offsetLeft - weekStrip.current.clientWidth / 2 + day.offsetWidth / 2; } }, [loading, profileLoading, completions.loading]);
  const inFlight = useRef(new Set<string>()); const touchStart = useRef<number | null>(null);
  useEffect(() => { const update = () => setOffline(!navigator.onLine); update(); window.addEventListener('online', update); window.addEventListener('offline', update); return () => {window.removeEventListener('online', update); window.removeEventListener('offline', update);}; }, []);
  const weekTasks = tasks.filter(task => task.due_date && days.includes(task.due_date)).map(task => isRecurring(task.recurring) && task.due_date === today && completions.isCompletedToday(task.id) ? {...task, status:'completed' as const} : task);
  const completedCount = weekTasks.filter(task => task.status === 'completed').length;
  const names = Object.fromEntries(members.map(member => [member.id, member.name])); if(profile) names[profile.id] = profile.name;
  const dayName = (date:string) => new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {weekday:'long', day:'numeric', month:'short', timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
  const fail = (id:string) => setErrors(current => ({...current, [id]:c('failed')}));
  const toggle = async (task:TaskRow, notify = true):Promise<boolean> => {
    setRetryMove(current => {const next={...current}; delete next[task.id]; return next;});
    if(inFlight.current.has(task.id) || offline || !profile) { fail(task.id); return false; }
    inFlight.current.add(task.id); setBusy(current => [...current, task.id]);
    try {
      const done = task.status === 'completed';
      const result = done ? await completions.undoComplete(task.id) : await completions.markComplete({taskId:task.id,userId:profile.id,recurring:isRecurring(task.recurring)});
      if(!result || (typeof result === 'object' && result.id.startsWith('offline-'))) {fail(task.id); return false;}
      setErrors(current => {const next = {...current}; delete next[task.id]; return next;});
      await Promise.all([refetch(), completions.refetch()]);
      if(notify && !done) toast(c('done'), {action:{label:c('undo'),onClick:() => {void toggle({...task,status:'completed'}, false);}}});
      return true;
    } catch {fail(task.id); return false;} finally {inFlight.current.delete(task.id); setBusy(current => current.filter(id => id !== task.id));}
  };
  const move = async (task:TaskRow, date:string, notify = true) => {
    if(!task.due_date || task.due_date === date) return;
    setRetryMove(current => ({...current,[task.id]:date}));
    if(offline || inFlight.current.has(task.id)) {fail(task.id); return;}
    inFlight.current.add(task.id); setBusy(current => [...current,task.id]);
    try {const ok = await updateTask(task.id, {due_date:date}); if(!ok) {fail(task.id); return;} setErrors(current => {const next={...current}; delete next[task.id]; return next;}); if(notify) toast(c('moved'), {action:{label:c('undo'),onClick:() => {void move({...task,due_date:date}, task.due_date!, false);}}});}
    catch {fail(task.id);} finally {inFlight.current.delete(task.id); setBusy(current => current.filter(id => id !== task.id));}
  };
  const sensors = useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}));
  const onDragEnd = ({active,over}:DragEndEvent) => {const task=weekTasks.find(item => item.id===active.id); if(task && over) void move(task,String(over.id));};
  const startPlan = () => { const [year,month,day]=days[0].split('-').map(Number); wizard.generate(weekTasks,members.length ? members.map(m => m.id) : profile ? [profile.id] : [],new Date(year,month-1,day)); };
  const apply = async () => {const result=await wizard.applyPlan(); if(result.errors.length) toast.error(c('failed')); else toast.success(result.created ? c('generated',{count:result.created}) : c('noGenerated')); await refetch(); if(!result.errors.length) {setDialog(false); wizard.reset();}};
  return <main className="space-y-5 px-5 py-5 text-bb-ink md:px-8" dir={locale === 'he' ? 'rtl':'ltr'}>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-bb-2xl font-bold">{c('title')}</h1><p className="text-bb-ink-2">{c('intro')}</p></div><button className={button} onClick={() => setDialog(true)} disabled={!profile?.household_id || offline}>{c('generate')}</button></header>
    {offline && <p role="status" className="rounded-bb-md bg-bb-warning-50 p-4 text-bb-warning-ink">{c('offline')}</p>}
    {(loading || profileLoading || completions.loading) ? <p role="status">{c('loading')}</p> : (error || profileError || (completions.error && Object.keys(errors).length === 0)) ? <div role="alert"><p>{c('error')}</p><button className={button} onClick={() => {void Promise.all([refetch(),refetchProfile(),completions.refetch()]);}}>{c('retry')}</button></div> : !profile?.household_id ? <p>{c('noHome')} <a className={button} href="/settings">{c('settings')}</a></p> : <>
      <div className="flex flex-wrap items-center gap-3"><p className="text-bb-ink-2 tabular-nums">{c('progress',{done:completedCount,total:weekTasks.length})}</p><progress className="h-2 w-28" style={{accentColor:"var(--bb-primary)"}} aria-label={c('progress',{done:completedCount,total:weekTasks.length})} value={completedCount} max={Math.max(weekTasks.length,1)} /></div>
      {weekTasks.length === 0 && <div className="rounded-bb-md bg-bb-primary-50 p-4"><p>{c('empty')}</p><a className={`${button} inline-flex items-center`} href="/tasks">{c('add')}</a></div>}
      <nav className="md:hidden" aria-label={c('title')}><div className="flex gap-1 overflow-x-auto">{days.map((date,index) => {const count=weekTasks.filter(task=>task.due_date===date).length; const short=locale==='he'?['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'][index]:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][index]; return <button key={date} onClick={() => setSelected(index)} aria-current={selected===index?'date':undefined} aria-label={`${dayName(date)}, ${count} ${locale==='he'?'משימות':count===1?'task':'tasks'}`} className={`min-h-11 min-w-11 flex-1 rounded-bb-md px-0 py-1 text-bb-sm ${selected===index?'bg-bb-primary text-bb-on-primary':'text-bb-ink'}`}><span className="block whitespace-nowrap">{short}</span><span className="block whitespace-nowrap tabular-nums">{Number(date.slice(-2))}{count > 0 && <span aria-hidden="true"> ·</span>}</span></button>;})}</div><div className="flex justify-between"><button className={button} disabled={selected===0} onClick={() => setSelected(i=>Math.max(0,i-1))}>{c('previous')}</button><button className={button} disabled={selected===6} onClick={() => setSelected(i=>Math.min(6,i+1))}>{c('next')}</button></div></nav>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}><div ref={weekStrip} className="overflow-x-auto"><div className="grid gap-4 md:grid-cols-7 md:min-w-[1356px]" onTouchStart={e => {touchStart.current=e.touches[0].clientX;}} onTouchEnd={e => {if(touchStart.current===null) return; const delta=e.changedTouches[0].clientX-touchStart.current; if(Math.abs(delta)>60) setSelected(i=>Math.min(6,Math.max(0,i+(delta*(locale==='he'?1:-1)>0?1:-1)))); touchStart.current=null;}}>{days.map((date,index) => <div key={date} data-today={date===today} className={index===selected?'block md:min-w-[180px]':'hidden md:block md:min-w-[180px]'}><DropDay date={date}><h2 className="mb-3 font-bold">{dayName(date)} {date===today && <span className="text-bb-sm text-bb-ink-2">({c('today')})</span>}</h2><div className="space-y-3">{weekTasks.filter(task=>task.due_date===date).map(task => <Draggable key={task.id} task={task}><div className="flex items-start gap-2 md:flex-col md:gap-0"><Check checked={task.status==='completed'} pending={busy.includes(task.id)} failed={!!errors[task.id]} onToggle={() => void toggle(task)} label={task.title}/><div className="min-w-0 flex-1 md:w-full"><p className="break-words font-semibold">{task.title}</p><div className="mt-2 flex flex-wrap gap-2 md:gap-1"><AvatarChip id={task.assigned_to ?? 'shared'} name={task.assigned_to ? names[task.assigned_to] ?? c('unknown') : c('shared')} size="sm"/><RoomMark room={(CATEGORY_NAME_TO_KEY[categoryMap[task.category_id ?? '']] ?? 'general') as CategoryKey} name={categoryMap[task.category_id ?? ''] ?? c('room')}/></div><div className="relative" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node | null)) setMoveOpen(null);}}><button type="button" aria-label={c('moving',{title:task.title})} aria-expanded={moveOpen===task.id} aria-controls={`move-${task.id}`} title={c('move')} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-bb-md text-bb-primary hover:bg-bb-primary-50 focus-visible:outline-2 focus-visible:outline-bb-primary" disabled={busy.includes(task.id)} onClick={() => setMoveOpen(open => open===task.id?null:task.id)} onKeyDown={e=>{if(e.key==='Escape') setMoveOpen(null);}}><CalendarDays size={20} aria-hidden="true" /></button>{moveOpen===task.id && <div id={`move-${task.id}`} className="absolute z-20 min-w-48 rounded-bb-md border border-bb-line bg-bb-card p-2 shadow-bb-1" onKeyDown={e=>{if(e.key==='Escape') {setMoveOpen(null); (e.currentTarget.previousElementSibling as HTMLButtonElement | null)?.focus();}}}><p className="px-3 text-bb-sm font-semibold">{c('move')}</p>{days.filter(d=>d!==date).map(d=><button key={d} type="button" className="block min-h-11 w-full rounded-bb-md px-3 text-start hover:bg-bb-primary-50 focus-visible:outline-2 focus-visible:outline-bb-primary" onClick={()=>{setMoveOpen(null); void move(task,d);}}>{dayName(d)}</button>)}</div>}</div>{errors[task.id] && <div role="alert"><p className="text-bb-danger-ink">{errors[task.id]}</p><button className={button} onClick={() => {if(retryMove[task.id]) void move(task,retryMove[task.id]); else void toggle(task);}}>{c('retry')}</button></div>}</div></div></Draggable>)}{weekTasks.every(task=>task.due_date!==date) && <p className="text-bb-ink-2">{c('dayEmpty')}</p>}</div></DropDay></div>)}</div></div></DndContext>
    </>}
    <Dialog open={dialog} title={c('generatorTitle')} onClose={() => {setDialog(false); wizard.reset();}}><p className="my-4">{c('generatorInfo')}</p>{!canUse('wizard') ? <p>{c('limited')} <a href="/upgrade" className={button}>{c('upgrade')}</a></p> : !wizard.plan ? <button className={button} onClick={startPlan}>{c('makePlan')}</button> : <><ul>{wizard.plan.map(day => <li key={day.date}><strong>{dayName(day.date)}</strong><ul>{day.tasks.filter(task=>!task.isExisting).map((task,index)=><li key={index}>{task.title}</li>)}</ul></li>)}</ul><button className={button} disabled={wizard.state==='applying' || offline} onClick={() => void apply()}>{c('apply')}</button></>}</Dialog>
  </main>;
}
