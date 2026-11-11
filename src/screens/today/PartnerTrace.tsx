'use client';
import { useCopy } from '@/hooks/useCopy';
import copy from '@/lib/i18n/fragments/today';
export function PartnerTrace({ name, task, completedAt }: { name?: string; task?: string; completedAt?: string }) {
  const { c } = useCopy(copy);
  if (!name || !task || !completedAt) return null;
  const minutes = Math.max(0, Math.floor((new Date().getTime() - new Date(completedAt).getTime()) / 60000));
  const time = minutes < 1 ? c('now') : minutes < 60 ? c('minutes', { count: minutes }) : minutes < 1440 ? c('hours', { count: Math.floor(minutes / 60) }) : c('days', { count: Math.floor(minutes / 1440) });
  return <p className="text-sm text-bb-ink-2">{c('partner', { name, task, time })}</p>;
}
