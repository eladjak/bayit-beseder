'use client';
import { useEffect } from 'react';
import { Illustration } from '@/components/v2/Illustration';
import { fireCelebration } from '@/lib/safe-confetti';
import { isQuietTime } from './useTodayModel';
import { useCopy } from '@/hooks/useCopy';
import copy from '@/lib/i18n/fragments/today';
export function DayDone({ date }: { date: string }) {
  const { c } = useCopy(copy);
  useEffect(() => {
    if (isQuietTime(new Date()) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const key = `today-celebration-${date}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch { return; }
    void fireCelebration();
  }, [date]);
  return <div><div className="max-w-56 overflow-hidden rounded-bb-md"><Illustration id="tasksDone" sizes="224px" decorative /></div><p className="mt-3 text-lg font-bold">{c('done')}</p></div>;
}
