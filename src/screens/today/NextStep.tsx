'use client';
import { Check } from '@/components/v2/index-a';
import { AvatarChip, RoomMark } from '@/components/v2/index-b';
import { CATEGORY_NAME_TO_KEY, type CategoryKey } from '@/lib/categories';
import type { TaskRow } from '@/lib/types/database';
import { useCopy } from '@/hooks/useCopy';
import copy from '@/lib/i18n/fragments/today';

export function NextStep({ task, name, room, pending, checked, failed, onComplete }: { task: TaskRow; name?: string; room?: string; pending: boolean; checked: boolean; failed: boolean; onComplete: () => void }) {
  const { c } = useCopy(copy);
  return <div className="flex items-start gap-3 border-b border-bb-line py-3"><Check checked={checked} pending={pending && !checked} failed={failed} label={task.title} onToggle={onComplete}/><div className="min-w-0 flex-1"><p className="font-bold">{task.title}</p><div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-bb-ink-2"><AvatarChip id={task.assigned_to ?? 'shared'} name={name ?? c('shared')} shared={!task.assigned_to} sharedLabel={c('shared')}/><span>{task.due_date ?? c('noDate')}</span><RoomMark room={(CATEGORY_NAME_TO_KEY[room ?? ''] ?? 'general') as CategoryKey} name={room ?? c('room')}/></div>{failed && <p role="alert" className="text-bb-danger-ink">{c('failed')} <button onClick={onComplete} className="min-h-11 underline focus-visible:outline-2">{c('retry')}</button></p>}</div></div>;
}
