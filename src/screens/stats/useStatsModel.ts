'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { useProfile } from '@/hooks/useProfile';
import { addDaysStr, ilDay, ilToday } from '@/lib/il-date';

export type Period = 'week' | 'month';
type Completion = { task_id: string; completed_at: string };
type Task = { id: string; category_id: string | null };
type Category = { id: string; name: string };
export function periodRange(period: Period, now = new Date()) {
 const today = ilToday(now);
 const day = new Date(`${today}T00:00:00Z`).getUTCDay();
 return { start: period === 'week' ? addDaysStr(today, -day) : `${today.slice(0, 7)}-01`, end: addDaysStr(today, 1) };
}
// Convert an Israel civil midnight to an instant, including daylight saving time.
export function israelMidnight(day: string) {
 const utc = Date.parse(`${day}T00:00:00Z`);
 const offset = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Jerusalem', timeZoneName:'shortOffset'}).formatToParts(new Date(utc)).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+2';
 const match = offset.match(/GMT([+-])(\d+)(?::(\d+))?/);
 const minutes = match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : 0;
 return new Date(utc - minutes * 60000).toISOString();
}
export function summarize(completions: Completion[], tasks: Task[], categories: Category[]) {
 const byTask = new Map(tasks.map(t => [t.id, t.category_id]));
 const byCategory = new Map(categories.map(c => [c.id, c.name]));
 const days = new Map<string, number>(), rooms = new Map<string, number>();
 for (const item of completions) {
  const day = ilDay(item.completed_at); days.set(day, (days.get(day) ?? 0) + 1);
  const category = byTask.get(item.task_id); const room = category ? byCategory.get(category) : undefined;
  if (room) rooms.set(room, (rooms.get(room) ?? 0) + 1);
 }
 return {total: completions.length, days: [...days].sort(([a],[b]) => a.localeCompare(b)).map(([label,value]) => ({label,value})), rooms: [...rooms].map(([label,value]) => ({label,value}))};
}
export function useStatsModel(period: Period) {
 const supabase = useSupabase(); const {profile, loading: profileLoading, error: profileError, refetch} = useProfile();
 const [state, setState] = useState<{loading:boolean; error:boolean; data:ReturnType<typeof summarize> | null}>({loading:true,error:false,data:null});
 const [version, setVersion] = useState(0);
 const retry = useCallback(() => { void refetch(); setVersion(v => v + 1); }, [refetch]);
 useEffect(() => {
  if (profileLoading || !profile?.household_id) return;
  let active = true; const household = profile.household_id; const range = periodRange(period);
  setState({loading:true,error:false,data:null});
  void (async () => { try {
   const [completions, tasks, categories] = await Promise.all([
    supabase.from('task_completions').select('task_id,completed_at').eq('household_id', household).gte('completed_at',israelMidnight(range.start)).lt('completed_at',israelMidnight(range.end)),
    supabase.from('tasks').select('id,category_id').eq('household_id', household),
    supabase.from('categories').select('id,name').eq('household_id', household),
   ]);
   if (completions.error || tasks.error || categories.error) throw new Error('query');
   if (active) setState({loading:false,error:false,data:summarize(completions.data ?? [],tasks.data ?? [],categories.data ?? [])});
  } catch { if(active) setState({loading:false,error:true,data:null}); } })();
  return () => {active = false};
 }, [supabase,profile?.household_id,profileLoading,period,version]);
 return {...state, loading: profileLoading || (!!profile?.household_id && state.loading), error: !!profileError || state.error, noHousehold: !profileLoading && !profileError && !profile?.household_id, retry};
}
