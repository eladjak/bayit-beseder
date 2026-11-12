import { Check } from '@/components/v2/Check';
import { AvatarChip } from '@/components/v2/AvatarChip';
import { RoomMark } from '@/components/v2/RoomMark';
import { CATEGORY_NAME_TO_KEY, type CategoryKey } from '@/lib/categories';
import type { TaskRow as Task } from '@/lib/types/database';
export function TaskRow({ task, name, room, when, pending, failed, onToggle, onEdit, overdue, overdueLabel, retry }: { task:Task; name:string; room?:string; when:string; pending:boolean; failed:boolean; onToggle:()=>void; onEdit:()=>void; overdue:boolean; overdueLabel:string; retry:string }) {
 return <li className="flex min-h-11 items-start gap-2 border-b border-bb-ink-4/20 py-3"><Check checked={task.status === 'completed'} pending={pending} failed={failed} onToggle={onToggle} label={task.title}/><div className="min-w-0 flex-1"><button type="button" onClick={onEdit} className="min-h-11 break-words text-start font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-bb-primary">{task.title}</button>{overdue && <span className="ms-2 text-bb-warning-ink">{overdueLabel}</span>}<div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><AvatarChip id={task.assigned_to ?? 'shared'} name={name} size="sm"/><span>{when}</span>{room && <RoomMark room={(CATEGORY_NAME_TO_KEY[room] ?? 'general') as CategoryKey} name={room}/>}</div>{failed && <button className="min-h-11 text-bb-danger-ink underline" onClick={onToggle}>{retry}</button>}</div></li>;
}
