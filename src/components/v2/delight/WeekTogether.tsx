'use client';
import { useEffect } from 'react';
import { useCompletions } from '@/hooks/useCompletions';
import { useCopy } from '@/hooks/useCopy';
import copy from '@/lib/i18n/fragments/delight';
import { isRecapTime, weekCount } from './quiet';

export function WeekTogether({ pending }: { pending: string[] }) {
 const { completions, refetch } = useCompletions();
 const { c } = useCopy(copy);
 useEffect(() => { if (!pending.length) void refetch(); }, [pending.length, refetch]);
 const now = new Date();
 const count = weekCount(completions ?? [], now);
 if (!isRecapTime(now) || !count) return null;
 return <div className="mt-6 rounded-bb-md bg-bb-card p-4 text-bb-ink shadow-bb-1"><p>{c('week', {count})}</p></div>;
}
