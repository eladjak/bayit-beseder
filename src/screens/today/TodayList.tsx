'use client';
import { useState } from 'react';
import type { TaskRow } from '@/lib/types/database';
import { useCopy } from '@/hooks/useCopy';
import copy from '@/lib/i18n/fragments/today';
import { NextStep } from './NextStep';
export function TodayList({ tasks, names, rooms, pending, confirmed, failed, onComplete }: { tasks: TaskRow[]; names: Record<string, string>; rooms: Record<string, string>; pending: string | null; confirmed: string | null; failed: string | null; onComplete: (task: TaskRow) => void }) {
 const [expanded, setExpanded] = useState(false); const { c } = useCopy(copy);
 if (!tasks.length) return null;
 const row = (task: TaskRow) => <NextStep key={task.id} task={task} name={task.assigned_to ? names[task.assigned_to] : undefined} room={task.category_id ? rooms[task.category_id] : undefined} pending={pending === task.id} checked={confirmed === task.id} failed={failed === task.id} onComplete={() => onComplete(task)} />;
 return <section className="rounded-bb-md bg-bb-card p-5"><h2 className="text-lg font-bold">{c('next')}</h2>{row(tasks[0])}{tasks.length > 1 && <><button className="min-h-11 text-bb-primary underline focus-visible:outline-2" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? c('less') : c('more', { count: tasks.length - 1 })}</button>{expanded && tasks.slice(1).map(row)}</>}</section>;
}
