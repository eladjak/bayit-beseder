'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { useProfile } from '@/hooks/useProfile';
import { ilDay } from '@/lib/il-date';
export const PAGE_SIZE = 20;
export type Entry = {id:string; task_id:string; user_id:string; completed_at:string; completed_by?:string | null};
export function groupHistory<T extends Entry>(rows:T[]) {
 const groups: {day:string;entries:T[]}[] = [];
 for (const row of [...rows].sort((a,b) => b.completed_at.localeCompare(a.completed_at))) {
  const day = ilDay(row.completed_at); let group = groups.find(g => g.day === day);
  if (!group) { group = {day,entries:[]}; groups.push(group); } group.entries.push(row);
 }
 return groups;
}
export function useHistoryModel() {
 const db = useSupabase(); const {profile, loading: profileLoading,error:profileError,refetch} = useProfile();
 const [rows,setRows] = useState<Entry[]>([]); const [tasks,setTasks] = useState<Record<string,string>>({}); const [people,setPeople] = useState<Record<string,string>>({});
 const [loading,setLoading] = useState(true); const [error,setError] = useState(false); const [more,setMore] = useState(false); const [page,setPage] = useState(0); const [version,setVersion] = useState(0);
 const retry = useCallback(() => { void refetch(); setVersion(v=>v+1); }, [refetch]);
 useEffect(() => { if(profileLoading || !profile?.household_id) return; let active = true; const id = profile.household_id;
  setLoading(true); setError(false);
  void (async () => { try {
   const [result,taskResult,peopleResult] = await Promise.all([
    db.from('task_completions').select('id,task_id,user_id,completed_at').eq('household_id',id).order('completed_at',{ascending:false}).order('id',{ascending:false}).range(0,(page+1)*PAGE_SIZE),
    db.from('tasks').select('id,title').eq('household_id',id),
    db.from('profiles').select('id,display_name').eq('household_id',id),
   ]);
   if(result.error || taskResult.error || peopleResult.error) throw new Error('query');
   if(active) {const data=result.data ?? []; setRows(data.slice(0,(page+1)*PAGE_SIZE)); setMore(data.length>(page+1)*PAGE_SIZE); setTasks(Object.fromEntries((taskResult.data ?? []).map(t=>[t.id,t.title]))); setPeople(Object.fromEntries((peopleResult.data ?? []).map(p=>[p.id,p.display_name ?? '']))); setLoading(false);}
  } catch {if(active){setError(true);setLoading(false)}} })(); return () => {active=false};
 }, [db,profile?.household_id,profileLoading,page,version]);
 return {groups:groupHistory(rows),tasks,people,loading:profileLoading || (!!profile?.household_id && loading),error:!!profileError || error,noHousehold:!profileLoading && !profileError && !profile?.household_id,more,loadMore:()=>setPage(p=>p+1),retry};
}
