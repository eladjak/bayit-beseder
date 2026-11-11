'use client';
import { useCallback, useState } from 'react';
import { Sheet } from '@/components/v2/Sheet';
import { VoiceInputButton } from '@/components/voice-input-button';
import { AvatarChip } from '@/components/v2/AvatarChip';
import { RoomMark } from '@/components/v2/RoomMark';
import { CATEGORY_NAME_TO_KEY, type CategoryKey } from '@/lib/categories';
import { isRecurring } from '@/lib/task-flags';
import { useCopy } from '@/hooks/useCopy';
import copy from '@/lib/i18n/fragments/tasks';
import type { TaskRow, TaskUpdate } from '@/lib/types/database';

type Props = { open:boolean; task:TaskRow|null; today:string; members:{id:string;name:string}[]; categories:{id:string;name:string}[]; onClose:()=>void; onSave:(data:TaskUpdate)=>Promise<boolean>; onDelete:()=>void };
export function TaskSheet(props:Props) {
 const {c}=useCopy(copy);
 return props.open ? <Sheet open title={props.task ? c('editTitle') : c('add')} onClose={props.onClose}><TaskForm {...props}/></Sheet> : null;
}
function TaskForm({task,today,members,categories,onClose,onSave,onDelete}:Props) {
 const {c}=useCopy(copy);
 const [title,setTitle]=useState(task?.title ?? ''); const [assigned,setAssigned]=useState(task?.assigned_to ?? ''); const [date,setDate]=useState(task?.due_date ?? today); const [category,setCategory]=useState(task?.category_id ?? ''); const [recurring,setRecurring]=useState(task ? isRecurring(task.recurring) : false); const [error,setError]=useState(false); const [saving,setSaving]=useState(false);
 const transcript=useCallback((text:string)=>setTitle(v=>[v.trim(),text.trim()].filter(Boolean).join(' ')),[]);
 const tomorrow=new Date(`${today}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
 async function submit(e:React.FormEvent) { e.preventDefault(); if(!title.trim() || saving) return; setSaving(true); setError(false); try { if(await onSave({title:title.trim(),assigned_to:assigned || null,due_date:date || null,category_id:category || null,recurring})) onClose(); else setError(true); } catch {setError(true)} finally {setSaving(false)} }
 const choice='min-h-11 rounded-bb-md border border-bb-line-strong px-3 focus-visible:outline-2 focus-visible:outline-bb-primary';
 return <form onSubmit={submit} className="space-y-4 pb-2"><label className="block font-semibold" htmlFor="task-title">{c('taskName')}</label><div className="flex gap-2"><input id="task-title" autoFocus className="min-h-11 min-w-0 flex-1 rounded-bb-md border border-bb-line-strong bg-bb-card px-3" placeholder={c('example')} value={title} onChange={e=>setTitle(e.target.value)}/><VoiceInputButton onTranscript={transcript} className="min-h-11 min-w-11 [&_button]:min-h-11 [&_button]:min-w-11"/></div>
 <details><summary className="min-h-11 cursor-pointer py-2 font-semibold">{c('details')}</summary><div className="space-y-4 py-2"><fieldset><legend>{c('who')}</legend><div className="flex flex-wrap gap-2">{[{id:'',name:c('shared')},...members].map(m=><button type="button" key={m.id} aria-pressed={assigned===m.id} className={`${choice} ${assigned===m.id?'bg-bb-primary-50':''}`} onClick={()=>setAssigned(m.id)}><AvatarChip id={m.id || 'shared'} name={m.name}/></button>)}</div></fieldset>
 <fieldset><legend>{c('when')}</legend><div className="flex flex-wrap gap-2"><button type="button" className={choice} aria-pressed={date===today} onClick={()=>setDate(today)}>{c('today')}</button><button type="button" className={choice} aria-pressed={date===tomorrow.toISOString().slice(0,10)} onClick={()=>setDate(tomorrow.toISOString().slice(0,10))}>{c('tomorrow')}</button><label className="block">{c('date')} <input className={`${choice} bg-bb-card`} type="date" dir="ltr" value={date} onChange={e=>setDate(e.target.value)}/></label></div></fieldset>
 <fieldset><legend>{c('room')}</legend><div className="flex flex-wrap gap-2"><button type="button" className={choice} aria-pressed={!category} onClick={()=>setCategory('')}>{c('none')}</button>{categories.map(room=><button type="button" className={choice} aria-pressed={category===room.id} key={room.id} onClick={()=>setCategory(room.id)}><RoomMark room={(CATEGORY_NAME_TO_KEY[room.name] ?? 'general') as CategoryKey} name={room.name}/></button>)}</div></fieldset>
 <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)}/>{c('repeat')}</label></div></details>
 {error && <p role="alert" className="text-bb-danger-ink">{c('saveError')}</p>}<div className="flex flex-wrap gap-3"><button disabled={saving || !title.trim()} className="min-h-11 rounded-bb-md bg-bb-primary px-5 text-bb-on-primary disabled:opacity-50" type="submit">{saving?c('saving'):error?c('retry'):c('save')}</button>{task && <button type="button" className="min-h-11 px-3 text-bb-danger-ink underline" onClick={onDelete}>{c('delete')}</button>}</div></form>;
}
