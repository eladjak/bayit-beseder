'use client';
import { useEffect, useState } from 'react';
import type { Playlist } from '@/lib/playlists';
import type { TaskRow } from '@/lib/types/database';
import { useCompletions } from '@/hooks/useCompletions';
import { useProfile } from '@/hooks/useProfile';
import { useCopy } from '@/hooks/useCopy';
import copy from '@/lib/i18n/fragments/playlists';
import { toast } from 'sonner';
import { isRecurring } from '@/lib/task-flags';

export function Player({ playlist, tasks, onStop }: { playlist: Playlist; tasks: TaskRow[]; onStop: () => void }) {
  const { c } = useCopy(copy);
  const { profile } = useProfile();
  const { markComplete, undoComplete } = useCompletions();
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(playlist.tasks[0]?.durationSeconds ?? 0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (paused || finished) return;
    const id = window.setTimeout(() => {
      if (seconds > 1) setSeconds(seconds - 1);
      else if (index + 1 >= playlist.tasks.length) { setSeconds(0); setFinished(true); }
      else { setIndex(index + 1); setSeconds(playlist.tasks[index + 1].durationSeconds); }
    }, 1000);
    return () => window.clearTimeout(id);
  }, [paused, finished, seconds, index, playlist]);
  function skip() {
    if (index + 1 >= playlist.tasks.length) setFinished(true);
    else { setIndex(index + 1); setSeconds(playlist.tasks[index + 1].durationSeconds); }
  }
  async function complete(task: TaskRow) {
    if (!profile || pending || checked.has(task.id)) return;
    setPending(task.id); setError(false);
    const result = await markComplete({ taskId: task.id, userId: profile.id, householdId: profile.household_id ?? undefined, recurring: isRecurring(task.recurring) });
    setPending(null);
    if (!result) { setError(true); return; }
    setChecked(previous => new Set(previous).add(task.id));
    toast(c('saved'), { classNames: { actionButton: 'min-h-11 min-w-11' }, action: { label: c('undo'), onClick: () => { void undoComplete(task.id).then(ok => { if (ok) { setChecked(previous => { const next = new Set(previous); next.delete(task.id); return next; }); toast(c('undone')); } else toast.error(c('undoFailed')); }); } } });
  }
  const button = 'min-h-11 px-5 rounded-bb-md border border-bb-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary';
  return <section className="mx-auto max-w-2xl space-y-6 px-4 py-8 text-bb-ink">
    <h1 className="text-2xl font-bold">{playlist.name}</h1>
    {finished ? <><h2 className="text-xl font-bold">{c('done')}</h2>{tasks.length > 0 && <><p>{c('review')}</p><ul className="divide-y divide-bb-line">{tasks.map(task => <li key={task.id} className="flex items-center justify-between gap-3 py-2"><span>{task.title}</span><button type="button" role="checkbox" aria-checked={checked.has(task.id)} aria-label={`${c('complete')}: ${task.title}`} disabled={pending !== null || !profile || checked.has(task.id)} onClick={() => void complete(task)} className={`${button} min-w-11`}>{checked.has(task.id) ? '✓' : '○'}</button></li>)}</ul>{error && <p role="alert" className="text-bb-danger-ink">{c('failed')}</p>}</> }<button className={button} onClick={onStop}>{c('back')}</button></> : <><div className="space-y-4 text-center"><p aria-live="polite">{c('step')} {index + 1} {c('of')} {playlist.tasks.length}: {playlist.tasks[index]?.title}</p><h2 className="text-3xl font-bold">{playlist.tasks[index]?.title}</h2><p>{c('left')}</p><div className="text-5xl font-bold tabular-nums" aria-label={`${c('left')}: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`} dir="ltr">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div><progress className="h-3 w-full accent-bb-primary" aria-label={c('progress')} value={Math.max(0, (playlist.tasks[index]?.durationSeconds ?? 0) - seconds)} max={playlist.tasks[index]?.durationSeconds || 1} />{paused && <p>{c('paused')}</p>}</div><div className="space-y-3"><button className={`${button} w-full bg-bb-primary text-bb-on-primary font-bold`} onClick={() => setPaused(!paused)}>{c(paused ? 'resume' : 'pause')}</button><div className="flex flex-wrap justify-center gap-3"><button className={button} onClick={skip}>{c('skip')}</button><button className={button} onClick={onStop}>{c('stop')}</button></div></div></>}
  </section>;
}
