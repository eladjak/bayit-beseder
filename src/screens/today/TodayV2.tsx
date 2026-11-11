'use client';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Illustration } from '@/components/v2/Illustration';
import { useProfile } from '@/hooks/useProfile';
import { useHousehold } from '@/hooks/useHousehold';
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers';
import { useTasks } from '@/hooks/useTasks';
import { useCompletions } from '@/hooks/useCompletions';
import { useCategories } from '@/hooks/useCategories';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useCopy } from '@/hooks/useCopy';
import { isRecurring } from '@/lib/task-flags';
import type { TaskRow } from '@/lib/types/database';
import copy from '@/lib/i18n/fragments/today';
import { chooseNextTask, isQuietTime } from './useTodayModel';
import { TodayMeal } from './TodayMeal';
import { TodayList } from './TodayList';
import { DayDone } from './DayDone';
import { PartnerTrace } from './PartnerTrace';

export function TodayV2() {
 const { c } = useCopy(copy);
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
 const { profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile();
 const home = useHousehold(profileLoading ? undefined : profile?.household_id);
 const { members } = useHouseholdMembers(profile?.household_id, today);
 const tasks = useTasks(); const completions = useCompletions({ limit: 500 }); const { categoryMap } = useCategories(); const shopping = useShoppingList();
 const [pending, setPending] = useState<string | null>(null); const [confirmed, setConfirmed] = useState<string | null>(null); const [failed, setFailed] = useState<string | null>(null);
 const isOpen = (task: TaskRow) => task.status !== 'skipped' && (isRecurring(task.recurring) ? !completions.isCompletedToday(task.id) : task.status !== 'completed');
 const open = tasks.tasks.filter(isOpen); const due = open.filter(t => t.due_date !== null && t.due_date <= today);
 const first = chooseNextTask(open, today); const shown = first ? [first, ...due.filter(t => t.id !== first.id).sort((a,b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))] : [];
 const completedToday = tasks.tasks.some(t => t.due_date !== null && t.due_date <= today && completions.isCompletedToday(t.id));
 const done = due.length === 0 && completedToday;
 const names = Object.fromEntries(members.map(m => [m.id, m.name]));
 const partner = members.find(m => m.id !== profile?.id); const latest = partner && completions.completions.find(x => x.user_id === partner.id && tasks.tasks.some(t => t.id === x.task_id));
 const lastTask = latest && tasks.tasks.find(t => t.id === latest.task_id);
 const complete = async (task: TaskRow) => {
  if (!profile || pending) return; setPending(task.id); setFailed(null);
  const result = await completions.markComplete({ taskId: task.id, userId: profile.id, householdId: profile.household_id ?? undefined, recurring: isRecurring(task.recurring) });
  if (!result || result.id.startsWith('offline-')) { setFailed(task.id); setPending(null); return; }
  setConfirmed(task.id);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => setTimeout(resolve, 180));
  await tasks.refetch(); setConfirmed(null); setPending(null);
  toast.success(c('complete'), { duration: 5000, action: { label: c('undo'), onClick: async () => { const ok = await completions.undoComplete(task.id); if (ok) await tasks.refetch(); else { setFailed(task.id); toast.error(c('undoFailed')); } } } });
 };
 const retry = () => { void refetchProfile(); void home.retry(); void tasks.refetch(); void completions.refetch(); };
 const base = 'mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 text-bb-ink';
 if (profileLoading || home.loading || tasks.loading || completions.loading) return <main className={base} aria-busy="true">{c('loading')}</main>;
 if (profileError || home.status === 'error' || tasks.error || completions.error) return <main className={base}><p role="alert">{typeof navigator !== 'undefined' && !navigator.onLine ? c('offline') : c('error')}</p><button className="min-h-11 self-start text-bb-primary underline focus-visible:outline-2" onClick={retry}>{c('retry')}</button></main>;
 if (!profile?.household_id || home.status === 'no-household') return <main className={base}><h1 className="text-2xl font-bold">{c('noHome')}</h1><Link href="/settings" className="inline-flex min-h-11 items-center text-bb-primary underline focus-visible:outline-2">{c('setup')}</Link></main>;
 const count = shopping.items.filter(item => !item.checked).length;
 return <main className={base}>
 <header className="grid items-center gap-5 rounded-bb-md bg-bb-card p-5 sm:grid-cols-2"><div><h1 className="text-2xl font-bold">{c('hello', { name: profile.name.split(' ')[0] })}</h1><p className="mt-1 text-bb-ink-2">{home.household.name}</p>{done && <DayDone date={today}/>}</div>{(!done || !isQuietTime(new Date())) && <div className={`max-h-48 overflow-hidden rounded-bb-md ${done ? 'motion-reduce:hidden' : ''}`}><Illustration id={done ? 'tasksDone' : 'heroHome'} sizes="(max-width: 640px) 90vw, 480px" decorative priority /></div>}</header>
 {!done && (shown.length ? <TodayList tasks={shown} names={names} rooms={categoryMap} pending={pending} confirmed={confirmed} failed={failed} onComplete={complete}/> : <section className="rounded-bb-md bg-bb-card p-5"><p>{c('empty')}</p><Link href="/tasks" className="inline-flex min-h-11 items-center text-bb-primary underline focus-visible:outline-2">{c('tasks')}</Link></section>)}
 <div className="grid gap-5 sm:grid-cols-2"><TodayMeal householdId={profile.household_id} today={today}/><section className="rounded-bb-md bg-bb-card p-5"><h2 className="text-lg font-bold">{c('shopping')}</h2><p className="mt-2 text-bb-ink-2">{shopping.loading ? c('loading') : shopping.loadError || shopping.storage !== 'server' ? c('shoppingError') : count ? c('shoppingCount', { count }) : c('shoppingEmpty')}</p><Link href="/shopping" className="inline-flex min-h-11 items-center text-bb-primary underline focus-visible:outline-2">{c('shopping')}</Link></section></div>
 <PartnerTrace name={partner?.name} task={lastTask?.title} completedAt={latest?.completed_at}/>
 </main>;
}
