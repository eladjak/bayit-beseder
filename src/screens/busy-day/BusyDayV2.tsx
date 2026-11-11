'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check } from '@/components/v2/Check';
import { Illustration } from '@/components/v2/Illustration';
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
  const visible = selectEssentialTasks(tasks, ilToday(), completions.isCompletedToday, overrides);
  return <main className="mx-auto max-w-3xl space-y-6 px-5 pb-28 pt-6 text-bb-ink" dir={locale === 'he' ? 'rtl' : 'ltr'}>
    <header className="space-y-3"><h1 className="text-bb-2xl font-bold">{c('title')}</h1><p className="text-bb-ink-2">{c('description')}</p></header>
    <div className="rounded-bb-md bg-bb-card p-4"><button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(!enabled)} className="flex min-h-11 w-full items-center justify-between gap-4 rounded-bb-sm text-start font-semibold hover:bg-bb-card-hover active:scale-[.99] focus-visible:outline-2 focus-visible:outline-bb-primary"><span>{c('toggle')}</span><span aria-hidden="true" className={enabled ? 'rounded-full bg-bb-primary px-3 py-1 text-bb-on-primary' : 'rounded-full border border-bb-line-strong px-3 py-1'}>{enabled ? '✓' : '○'}</span></button><p className="text-bb-sm text-bb-ink-2">{c('device')}</p></div>
    {status === 'loading' || completions.loading ? <p role="status">{c('loading')}</p> : status === 'error' ? <div role="alert"><p>{c('error')}</p><button onClick={() => void fetchData()} className="min-h-11 min-w-11 underline focus-visible:outline-2">{c('retry')}</button></div> : status === 'no-home' ? <p>{c('noHome')}</p> : visible.length === 0 ? <div className="space-y-4 text-center"><div className="mx-auto max-w-48"><Illustration id="emptyTasks" sizes="192px" decorative /></div><p>{c('empty')}</p></div> : <ul className="space-y-4">{visible.map(task => <li key={task.id} className="flex gap-3 rounded-bb-md bg-bb-card p-4"><Check checked={done(task)} pending={pending.has(task.id)} failed={Object.hasOwn(failures, task.id)} onToggle={() => void toggle(task)} label={task.title} /><div className="flex-1"><p className="pt-2 font-semibold">{task.title}</p><div aria-live="polite">{Object.hasOwn(failures, task.id) && <div className="text-bb-danger-ink"><p>{c('failure')}</p><button onClick={() => void toggle(task, failures[task.id])} className="min-h-11 min-w-11 underline focus-visible:outline-2">{c('retry')}</button></div>}</div></div></li>)}</ul>}
  </main>;
}
