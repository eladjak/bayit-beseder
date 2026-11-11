'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check } from '@/components/v2/Check';
import { Illustration } from '@/components/v2/Illustration';
import { Notice } from '@/components/v2/Notice';
import { Skeleton } from '@/components/v2/Skeleton';
import { Button } from '@/components/v2/Button';
import { useCompletions } from '@/hooks/useCompletions';
import { useCopy } from '@/hooks/useCopy';
import { useTranslation } from '@/hooks/useTranslation';
import { createClient } from '@/lib/supabase';
import { ilToday } from '@/lib/il-date';
import { isRecurring } from '@/lib/task-flags';
import copy from '@/lib/i18n/fragments/busy-day';
import { useBusyDay } from './useBusyDay';

type Task = { id: string; title: string; due_date: string | null; status: string | null; recurring: unknown };
export function selectEssentialTasks<T extends { id: string; due_date: string | null; status: string | null; recurring: unknown }>(tasks: T[], today: string, completedToday: (id: string) => boolean, overrides: Record<string, boolean>) {
  return tasks.filter(task => task.due_date && task.due_date <= today && ['pending', 'completed'].includes(task.status ?? '') && (isRecurring(task.recurring) || task.status !== 'completed' || completedToday(task.id) || overrides[task.id] !== undefined));
}
export function BusyDayV2() {
  const { c } = useCopy(copy);
  const { locale } = useTranslation();
  const { enabled, setEnabled } = useBusyDay();
  const completions = useCompletions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-home'>('loading');
  const [userId, setUserId] = useState('');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [failures, setFailures] = useState<Record<string, boolean>>({});
  const pendingRef = useRef(new Set<string>());
  const fetchData = useCallback(async () => {
    setStatus('loading');
    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!user) { setStatus('no-home'); return; }
      setUserId(user.id);
      const { data: profile, error: profileError } = await db.from('profiles').select('household_id').eq('id', user.id).single();
      if (profileError) throw profileError;
      if (!profile?.household_id) { setStatus('no-home'); return; }
      const { data, error } = await db.from('tasks').select('id, title, due_date, status, recurring').lte('due_date', ilToday()).in('status', ['pending', 'completed']).order('due_date', { ascending: true });
      if (error) throw error;
      setTasks(data ?? []); setStatus('ready');
    } catch { setStatus('error'); }
  }, []);
  useEffect(() => { void fetchData(); }, [fetchData]);
  const done = (task: Task) => overrides[task.id] ?? (isRecurring(task.recurring) ? completions.isCompletedToday(task.id) : task.status === 'completed');
  async function toggle(task: Task, undo = false): Promise<boolean> {
    if (pendingRef.current.has(task.id)) return false;
    pendingRef.current.add(task.id); setPending(prev => new Set(prev).add(task.id));
    setFailures(prev => { const next = { ...prev }; delete next[task.id]; return next; });
    const wasDone = undo || done(task);
    let ok = false;
    try { ok = wasDone ? await completions.undoComplete(task.id) : !!(await completions.markComplete({ taskId: task.id, userId, recurring: isRecurring(task.recurring) })); } catch { ok = false; }
    if (ok) {
      setOverrides(prev => ({ ...prev, [task.id]: !wasDone }));
      if (!wasDone) toast(c('done'), { duration: 5000, actionButtonStyle: { minHeight: 44, minWidth: 44 }, action: { label: c('undo'), onClick: () => { void toggle(task, true); } } });
    } else setFailures(prev => ({ ...prev, [task.id]: wasDone }));
    pendingRef.current.delete(task.id); setPending(prev => { const next = new Set(prev); next.delete(task.id); return next; });
    return ok;
  }
  const today = ilToday();
  const visible = selectEssentialTasks(tasks, today, completions.isCompletedToday, overrides).sort((a, b) => Number(done(a)) - Number(done(b)));
  const firstOpen = visible.find(task => !done(task))?.id;
  function dateLabel(date: string | null) {
    if (!date) return c('unspecified');
    if (date === today) return c('today');
    const next = new Date(`${today}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    if (date === next.toISOString().slice(0, 10)) return c('tomorrow');
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'he-IL', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  }
  return <main className="mx-auto max-w-3xl space-y-6 px-5 pb-28 pt-6 text-bb-ink" dir={locale === 'he' ? 'rtl' : 'ltr'}>
    <header className="space-y-3"><h1 className="text-bb-2xl font-bold">{c('title')}</h1><p className="text-bb-ink-2">{c('description')}</p></header>
    <div className="rounded-bb-md bg-bb-card p-4"><button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(!enabled)} className="flex min-h-11 w-full items-center justify-between gap-4 rounded-bb-sm text-start font-semibold hover:bg-bb-card-hover active:scale-[.99] focus-visible:outline-2 focus-visible:outline-bb-primary"><span>{c('toggle')}</span><span className="flex items-center gap-2"><span>{enabled ? c('on') : c('off')}</span><span aria-hidden="true" className={`relative inline-flex h-7 w-12 items-center rounded-full ${enabled ? 'bg-bb-primary' : 'bg-bb-line-strong'}`}><span className={`absolute size-5 rounded-full bg-bb-card motion-safe:transition-transform motion-safe:duration-150 ${enabled ? 'end-1' : 'start-1'}`} /></span></span></button><p className="text-bb-sm text-bb-ink-2">{c('device')}</p></div>
    {status === 'error' ? <Notice tone="error" action={<Button variant="quiet" onClick={() => void fetchData()}>{c('retry')}</Button>}>{c('error')}</Notice> : status === 'loading' || completions.loading ? <Skeleton variant="card" label={c('loading')} /> : status === 'no-home' ? <p>{c('noHome')}</p> : visible.length === 0 ? <div className="space-y-4 text-center"><div className="mx-auto max-w-48"><Illustration id="emptyTasks" sizes="192px" decorative /></div><p>{c('empty')}</p></div> : <ul className="space-y-4">{visible.map(task => <li key={task.id} className={`flex gap-3 rounded-bb-md bg-bb-card p-4 ${done(task) ? 'opacity-60' : ''} ${task.id === firstOpen ? 'ring-2 ring-bb-primary' : ''}`}><Check checked={done(task)} pending={pending.has(task.id)} failed={Object.hasOwn(failures, task.id)} onToggle={() => void toggle(task)} label={task.title} /><div className="flex-1"><p className={`pt-2 font-semibold ${done(task) ? 'line-through' : ''}`}>{task.title}</p><p className="text-bb-sm text-bb-ink-2">{task.due_date && task.due_date < today ? `${c('late')} · ` : ''}{dateLabel(task.due_date)}</p><div aria-live="polite">{Object.hasOwn(failures, task.id) && <div className="text-bb-danger-ink"><p>{c('failure')}</p><Button variant="link" onClick={() => void toggle(task, failures[task.id])}>{c('retry')}</Button></div>}</div></div></li>)}</ul>}
  </main>;
}
