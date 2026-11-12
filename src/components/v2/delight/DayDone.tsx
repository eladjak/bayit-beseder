'use client';
import { useEffect, useRef, useState } from 'react';
import { Illustration } from '@/components/v2/Illustration';
import { useCopy } from '@/hooks/useCopy';
import { fireCelebration } from '@/lib/safe-confetti';
import { isRecurring } from '@/lib/task-flags';
import type { TaskRow } from '@/lib/types/database';
import copy from '@/lib/i18n/fragments/delight';
import { israelDate, isQuiet } from './quiet';

export function DayDone({ tasks, pending, isCompletedToday, today }: { tasks: TaskRow[]; pending: string[]; isCompletedToday: (id: string) => boolean; today: string }) {
 const { c } = useCopy(copy);
 const [visible, setVisible] = useState(false);
 const [textOnly, setTextOnly] = useState(true);
 const previous = useRef<{open: string[]; pending: string[]} | null>(null);
 const open = tasks.filter(t => t.due_date === today && t.status !== 'completed' && !(isRecurring(t.recurring) && isCompletedToday(t.id))).map(t => t.id);
 useEffect(() => {
  const prior = previous.current;
  if (prior && prior.open.length === 1 && open.length === 0 && (prior.pending.includes(prior.open[0]) || pending.includes(prior.open[0]))) {
   const now = new Date();
   const quiet = isQuiet(now) || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   queueMicrotask(() => { setTextOnly(quiet); setVisible(true); });
   if (!quiet) {
    try { const key = `bayit-day-done-confetti-${israelDate(now)}`; if (!localStorage.getItem(key)) { localStorage.setItem(key, '1'); void fireCelebration(); } } catch { /* storage unavailable: avoid repeating effects */ }
   }
  }
  previous.current = {open, pending};
 });
 useEffect(() => {
  if (!visible) return;
  const dismiss = () => setVisible(false);
  document.addEventListener('click', dismiss, true);
  document.addEventListener('keydown', dismiss, true);
  return () => { document.removeEventListener('click', dismiss, true); document.removeEventListener('keydown', dismiss, true); };
 }, [visible]);
 if (!visible) return null;
 return <div role="status" className="mt-6 rounded-bb-md bg-bb-mint-50 p-4 text-bb-ink">{!textOnly && <div className="mb-3 w-32"><Illustration id="coupleCelebration" sizes="128px" decorative /></div>}<p>{c('done')}</p></div>;
}
