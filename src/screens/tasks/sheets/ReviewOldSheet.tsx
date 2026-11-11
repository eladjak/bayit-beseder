import { jerusalemDay } from '../useTasksModel';
export function oldTasks<T extends { due_date:string|null; status:string }>(tasks:T[], now = new Date()):T[] {
 const date = new Date(`${jerusalemDay(now)}T12:00:00Z`); date.setUTCDate(date.getUTCDate()-14); const threshold = date.toISOString().slice(0,10);
 return tasks.filter(t=>t.status !== 'completed' && !!t.due_date && t.due_date < threshold);
}

import { useState } from 'react';
import { Sheet } from '@/components/v2/Sheet';
import { useTranslation } from '@/hooks/useTranslation';
import type { TaskRow, TaskUpdate } from '@/lib/types/database';
export function ReviewOldSheet({open,onClose,tasks,updateTask,onDelete,today}:{open:boolean;onClose:()=>void;tasks:TaskRow[];updateTask:(id:string,data:TaskUpdate)=>Promise<boolean>;onDelete:(task:TaskRow)=>void;today:string}) {
 const {locale}=useTranslation(); const en=locale==='en'; const [busy,setBusy]=useState<string|null>(null); const [error,setError]=useState(''); const [message,setMessage]=useState(''); const [confirm,setConfirm]=useState<string|null>(null); const old=oldTasks(tasks); const next=new Date(`${today}T12:00:00Z`);next.setUTCDate(next.getUTCDate()+7);
 async function move(id:string,due_date:string){setBusy(id);setError('');setMessage('');try {if(!await updateTask(id,{due_date}))throw Error();setMessage(en?'Task updated':'המשימה עודכנה')}catch{setError(en?'Could not update. Try again.':'לא הצלחנו לעדכן. נסו שוב.')}finally{setBusy(null)}}
 const button='min-h-11 rounded-bb-md border border-bb-line-strong px-3';
 return <Sheet open={open} title={en?'Review old tasks':'בדיקת משימות ישנות'} onClose={onClose}><p className="my-3">{en?'Tasks more than 14 days overdue. Choose what to do with each one.':'משימות באיחור של יותר מ־14 ימים. בחרו מה לעשות עם כל משימה.'}</p>{!old.length&&<p>{en?'No old tasks to review.':'אין משימות ישנות לבדיקה.'}</p>}<ul>{old.map(t=><li key={t.id} className="border-b border-bb-line-strong py-3"><strong>{t.title}</strong><p>{t.due_date}</p><div className="flex flex-wrap gap-2"><button disabled={!!busy} className={button} onClick={()=>void move(t.id,today)}>{en?'Do today':'לעשות היום'}</button><button disabled={!!busy} className={button} onClick={()=>void move(t.id,next.toISOString().slice(0,10))}>{en?'Next week':'לדחות לשבוע הבא'}</button><button disabled={!!busy} className={button} onClick={()=>setConfirm(t.id)}>{en?'Delete':'למחוק'}</button></div>{confirm===t.id&&<div><p>{en?'Delete this task? You can undo for 5 seconds.':'למחוק את המשימה? אפשר לבטל במשך 5 שניות.'}</p><button className={button} onClick={()=>{onDelete(t);setConfirm(null)}}>{en?'Confirm delete':'אישור מחיקה'}</button><button className={button} onClick={()=>setConfirm(null)}>{en?'Cancel':'ביטול'}</button></div>}</li>)}</ul>{busy&&<p role="status">{en?'Saving…':'שומרים…'}</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</Sheet>;
}
