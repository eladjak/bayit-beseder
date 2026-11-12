'use client';
import { useState } from 'react';
import { BedDouble, Bath, Coffee, Home, Sparkles, Sofa, ListChecks } from 'lucide-react';
import { PLAYLISTS, type Playlist } from '@/lib/playlists';
import { useTasks } from '@/hooks/useTasks';
import { useCompletions } from '@/hooks/useCompletions';
import { useCopy } from '@/hooks/useCopy';
import { useTranslation } from '@/hooks/useTranslation';
import copy from '@/lib/i18n/fragments/playlists';
import { israelToday, playlistMinutes, taskMinutes, taskPlaylist } from './useTaskPlaylist';
import { Player } from './Player';
import type { TaskRow } from '@/lib/types/database';
const icons: Record<string, typeof Coffee> = { 'morning-kitchen':Coffee, 'evening-living':Sofa, bathroom:Bath, bedroom:BedDouble, 'quick-guests':Home, 'friday-routine':Sparkles };
const english = [
 ['Morning kitchen', 'Wash dishes', 'Wipe surfaces', 'Set the table', 'Take out the trash'],
 ['Evening living room', 'Arrange cushions', 'Clean the table', 'Vacuum', 'Arrange remotes and magazines'],
 ['Bathroom', 'Clean the sink', 'Clean the toilet', 'Wipe the mirror', 'Arrange towels', 'Clean the floor'],
 ['Bedroom', 'Make the bed', 'Tidy the dresser', 'Air the room', 'Fold clothes'],
 ['Quick clean before guests', 'Tidy the living room', 'Clean the bathroom', 'Tidy the kitchen', 'Clean the entrance', 'Freshen the room'],
 ['Friday routine', 'Vacuum the house', 'Wash the floors', 'Change towels', 'Set the Shabbat table'],
];
export default function PlaylistsV2() {
 const { c } = useCopy(copy);
 const { locale } = useTranslation();
 const { tasks, loading, error, refetch } = useTasks();
 const completions = useCompletions();
 const [active, setActive] = useState<{playlist: Playlist; tasks: TaskRow[]} | null>(null);
 const today = taskPlaylist(tasks, israelToday(), completions.todayCompletionIds);
 const generated: Playlist = { id:'today', name:c('ours'), icon:'', totalMinutes:today.reduce((sum, task) => sum + taskMinutes(task), 0), tasks:today.map(task => ({title:task.title, durationSeconds:taskMinutes(task) * 60})) };
 if (active) return <Player playlist={active.playlist} tasks={active.tasks} onStop={() => setActive(null)} />;
 return <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 text-bb-ink"><header><h1 className="text-3xl font-bold">{c('title')}</h1><p className="mt-2 text-bb-ink-2">{c('intro')}</p></header><section className="space-y-3"><h2 className="text-xl font-bold">{c('ours')}</h2>{loading || completions.loading ? <p>{c('loading')}</p> : error || completions.error ? <div role="alert"><p>{c('error')}</p><button className="min-h-11 underline" onClick={() => { void refetch(); void completions.refetch(); }}>{c('retry')}</button></div> : today.length ? <><p>{c('estimate')}</p><button className="flex min-h-11 w-full items-center gap-4 rounded-bb-md bg-bb-card p-4 text-start shadow-bb-1 focus-visible:outline-2 focus-visible:outline-bb-primary" onClick={() => setActive({playlist: generated, tasks:today})}><ListChecks aria-hidden="true"/><span className="flex min-w-0 flex-col"><strong>{c('ours')}</strong><span>{playlistMinutes(generated.tasks)} {c('minutes')} · {today.length} {c('steps')}</span></span></button></> : <p>{c('empty')}</p>}</section><section className="space-y-3"><h2 className="text-xl font-bold">{c('builtins')}</h2><div className="grid gap-3 sm:grid-cols-2">{PLAYLISTS.map((original, i) => {const playlist = locale === 'en' ? { ...original, name: english[i][0], tasks: original.tasks.map((task, j) => ({ ...task, title: english[i][j + 1] })) } : original; const Icon=icons[playlist.id] ?? ListChecks; return <button key={playlist.id} onClick={() => setActive({playlist,tasks:[]})} className="flex min-h-11 items-center gap-4 rounded-bb-md bg-bb-card p-4 text-start shadow-bb-1 focus-visible:outline-2 focus-visible:outline-bb-primary"><Icon aria-hidden="true"/><span className="flex flex-col"><strong>{playlist.name}</strong><span>{playlistMinutes(playlist.tasks)} {c('minutes')} · {playlist.tasks.length} {c('steps')}</span></span></button>})}</div></section></main>;
}
