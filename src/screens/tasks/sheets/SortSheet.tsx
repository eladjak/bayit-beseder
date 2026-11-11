'use client';
import { Sheet } from '@/components/v2/Sheet';
import { useTranslation } from '@/hooks/useTranslation';
import type { TaskSort } from '../useTasksModel';
export function SortSheet({open,onClose,value,onChange}:{open:boolean;onClose:()=>void;value:TaskSort;onChange:(value:TaskSort)=>void}) {
 const {locale}=useTranslation(); const en=locale==='en'; const options: [TaskSort,string,string][]=[['due','תאריך יעד','Due date'],['room','חדר','Room'],['who','מי','Who'],['newest','החדשות ביותר','Newest']];
 return <Sheet open={open} title={en?'Sort tasks':'מיון משימות'} onClose={onClose}><p className="my-3">{en?'Choose how tasks are ordered on this device.':'בחרו איך לסדר את המשימות במכשיר הזה.'}</p><fieldset><legend className="sr-only">{en?'Sort by':'מיון לפי'}</legend>{options.map(([id,he,eng])=><label key={id} className="flex min-h-11 items-center gap-3"><input type="radio" name="task-sort" checked={value===id} onChange={()=>onChange(id)} className="size-11"/>{en?eng:he}</label>)}</fieldset></Sheet>;
}
