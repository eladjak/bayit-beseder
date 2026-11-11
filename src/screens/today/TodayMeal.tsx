'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { useCopy } from '@/hooks/useCopy';
import copy from '@/lib/i18n/fragments/today';

export function TodayMeal({ householdId, today }: { householdId: string; today: string }) {
  const supabase = useSupabase();
  const { c } = useCopy(copy);
  const [state, setState] = useState<{ loading: boolean; name: string | null; error: boolean }>({ loading: true, name: null, error: false });
  const load = useCallback(async () => {
    setState({ loading: true, name: null, error: false });
    try {
      const { data, error } = await supabase.from('meal_plan').select('meal_id').eq('household_id', householdId).eq('plan_date', today).neq('status', 'skipped').limit(1);
      if (error) throw error;
      if (!data?.[0]?.meal_id) { setState({ loading: false, name: null, error: false }); return; }
      const result = await supabase.from('meals').select('name').eq('household_id', householdId).eq('id', data[0].meal_id).maybeSingle();
      if (result.error) throw result.error;
      setState({ loading: false, name: result.data?.name ?? null, error: false });
    } catch { setState({ loading: false, name: null, error: true }); }
  }, [supabase, householdId, today]);
  useEffect(() => { void load(); }, [load]);
  return <section className="rounded-bb-md bg-bb-card p-5"><h2 className="text-lg font-bold">{c('meal')}</h2><p className="mt-2 text-bb-ink-2">{state.loading ? c('loading') : state.error ? c('mealError') : state.name ?? c('noMeal')}</p>{state.error ? <button className="min-h-11 text-bb-primary underline focus-visible:outline-2" onClick={load}>{c('retry')}</button> : <Link className="inline-flex min-h-11 items-center text-bb-primary underline focus-visible:outline-2" href="/meals">{c('planMeal')}</Link>}</section>;
}
