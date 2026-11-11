'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMealPlanner, type SwapAlternative } from '@/hooks/useMealPlanner';
import { useCopy } from '@/hooks/useCopy';
import { useLanguage } from '@/components/LanguageProvider';
import copy from '@/lib/i18n/fragments/meals';
import { Button } from '@/components/v2/Button';
import { Sheet } from '@/components/v2/Sheet';
import { Dialog } from '@/components/v2/Dialog';
import { Illustration } from '@/components/v2/Illustration';
import { todayMeal } from './useMealsModel';
import type { GeneratedMealDay } from '@/lib/meals/generator';

type Item = { title: string; quantity?: number; unit?: string };
const row = 'min-h-12 w-full rounded-bb-md px-4 py-3 text-start hover:bg-bb-primary-50 focus-visible:outline-2 focus-visible:outline-bb-primary motion-safe:transition-transform motion-safe:active:scale-[.99]';
export default function MealsV2() {
  const planner = useMealPlanner();
  const { c } = useCopy(copy);
  const { locale } = useLanguage();
  const [offline, setOffline] = useState(false);
  const [day, setDay] = useState<GeneratedMealDay | null>(null);
  const [alternatives, setAlternatives] = useState<SwapAlternative[] | null>(null);
  const [dayError, setDayError] = useState<{ date: string; mealId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [shoppingError, setShoppingError] = useState(false);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  useEffect(() => { const update = () => setOffline(!navigator.onLine); update(); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  const today = todayMeal(planner.week?.days ?? []);
  async function openAlternatives(target: GeneratedMealDay) {
    setDay(target); setAlternatives(null); setDayError(null);
    try { setAlternatives(await planner.fetchAlternatives(target.date)); } catch { setDayError({ date: target.date }); setDay(null); }
  }
  async function swap(target: GeneratedMealDay, mealId: string) {
    setBusy(true); setDayError(null);
    try {
      await planner.swapDay(target.date, mealId); setDay(null);
      toast.success(c('swapped'), { duration: 5000, classNames: { actionButton: 'min-h-11 min-w-11 focus-visible:outline-2 focus-visible:outline-bb-primary' }, ...(target.mealId ? { action: { label: c('undo'), onClick: () => { void planner.swapDay(target.date, target.mealId!).catch(() => { setDayError({date: target.date, mealId: target.mealId!}); toast.error(c('undoFailed')); }); } } } : {}) });
    } catch { setDayError({ date: target.date, mealId }); setDay(null); }
    finally { setBusy(false); }
  }
  async function loadShopping() {
    setPreview(true); setShoppingLoading(true); setShoppingError(false);
    try { const res = await fetch('/api/meals/shopping-suggest'); if (!res.ok) throw new Error(); const data = await res.json(); const suggestions: Item[] = data.suggestions ?? []; setItems(suggestions); setSelected(suggestions.map(() => true)); }
    catch { setShoppingError(true); } finally { setShoppingLoading(false); }
  }
  async function addShopping() {
    const chosen = items.filter((_, i) => selected[i]); if (!chosen.length) return;
    setBusy(true); setShoppingError(false);
    try { const res = await fetch('/api/meals/shopping-suggest', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({items:chosen}) }); if (!res.ok) throw new Error(); const data = await res.json(); setPreview(false); toast.success(c('added', {count: data.added}), { duration:5000, classNames: { actionButton: 'min-h-11 min-w-11 focus-visible:outline-2 focus-visible:outline-bb-primary' }, action: { label:c('list'), onClick: () => { window.location.href = '/shopping'; } } }); }
    catch { setShoppingError(true); } finally { setBusy(false); }
  }
  const noHousehold = planner.error?.includes('משק בית');
  const error = offline ? c('offline') : noHousehold ? c('household') : c('error');
  return <main dir={locale === 'he' ? 'rtl' : 'ltr'} className="mx-auto max-w-3xl space-y-6 px-5 pb-28 pt-6 text-bb-ink sm:px-8">
    <header><h1 className="text-bb-2xl font-bold">{c('title')}</h1><p className="text-bb-ink-2">{c('subtitle')}</p></header>
    {offline && !planner.error && <p role="status" className="rounded-bb-md bg-bb-warning-50 p-4 text-bb-warning-ink">{c('offline')}</p>}
    {planner.loading && !planner.week && <p role="status">{c('load')}</p>}
    {planner.error && <div role="alert" className="space-y-2 rounded-bb-md bg-bb-danger-50 p-4 text-bb-danger-ink"><p>{error}</p><Button variant="quiet" onClick={() => void planner.refetch()}>{c('retry')}</Button></div>}
    {!planner.loading && !planner.error && (!planner.week || planner.week.days.length === 0) && <section className="space-y-4 rounded-bb-lg bg-bb-card p-5"><div className="max-w-48"><Illustration id="emptyWeekly" sizes="192px" decorative /></div><p>{c('empty')}</p><Button onClick={() => void planner.regenerateWeek()}>{c('build')}</Button></section>}
    {planner.week && planner.week.days.length > 0 && <>
      <section className="space-y-2 rounded-bb-lg bg-bb-card p-5"><h2 className="text-bb-lg font-bold">{c('today')}</h2><p className="text-bb-xl font-semibold">{today?.mealName ?? c('noMeal')}</p></section>
      <section><h2 className="mb-3 text-bb-lg font-bold">{c('week')}</h2><ul className="divide-y divide-bb-line rounded-bb-md bg-bb-card">{planner.week.days.map(d => <li key={d.date}><button type="button" className={row} onClick={() => {setDay(d); setAlternatives(null);}}><span className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {weekday:'long', day:'numeric', month:'short', timeZone:'UTC'}).format(new Date(`${d.date}T12:00:00Z`))}{d.date === today?.date && ` · ${c('today')}`}</span><span>{d.mealName ?? c('noMeal')}</span></span></button>{dayError?.date === d.date && <div role="alert" className="px-4 pb-3 text-bb-danger-ink"><p>{c('failed')}</p><Button variant="quiet" onClick={() => dayError.mealId ? void swap(d, dayError.mealId) : void openAlternatives(d)}>{c('retry')}</Button></div>}</li>)}</ul></section>
      <div className="flex flex-wrap gap-3"><Button variant="quiet" onClick={() => setConfirm(true)}>{c('regenerate')}</Button><Button variant="quiet" onClick={() => void loadShopping()}>{c('shopping')}</Button></div>
    </>}
    <Sheet open={!!day} title={day?.mealName ?? c('noMeal')} onClose={() => setDay(null)}>{day && <div className="space-y-3 pt-4"><p>{day.date}</p>{alternatives === null ? <Button onClick={() => void openAlternatives(day)}>{c('change')}</Button> : <><p>{c('alternatives')}</p>{alternatives.length === 0 && <p>{c('none')}</p>}{alternatives.map(alt => <button disabled={busy} key={alt.id} className={row} onClick={() => void swap(day, alt.id)}>{alt.name}</button>)}</>}</div>}</Sheet>
    <Dialog open={confirm} title={c('confirmTitle')} onClose={() => setConfirm(false)}><div className="space-y-4 pt-4"><p>{c('confirmText')}</p><div className="flex flex-wrap gap-2"><Button onClick={() => {setConfirm(false); void planner.regenerateWeek();}}>{c('confirm')}</Button><Button variant="quiet" onClick={() => setConfirm(false)}>{c('cancel')}</Button></div></div></Dialog>
    <Sheet open={preview} title={c('preview')} onClose={() => setPreview(false)}><div className="space-y-3 pt-4"><p>{c('choose')}</p>{shoppingLoading && <p role="status">{c('load')}</p>}{shoppingError && <div role="alert"><p>{c('shoppingError')}</p><Button variant="quiet" onClick={() => void loadShopping()}>{c('retry')}</Button></div>}{!shoppingLoading && !shoppingError && items.length === 0 && <p>{c('noItems')}</p>}<ul>{items.map((item, i) => <li key={`${item.title}-${i}`}><label className="flex min-h-12 cursor-pointer items-center gap-3"><input className="size-11 accent-bb-primary" type="checkbox" checked={selected[i] ?? false} onChange={e => setSelected(s => s.map((v, n) => n === i ? e.target.checked : v))} /><span>{item.title}{item.quantity ? ` · ${item.quantity} ${item.unit ?? ''}` : ''}</span></label></li>)}</ul>{items.length > 0 && <Button disabled={busy || !selected.some(Boolean)} onClick={() => void addShopping()}>{c('add')}</Button>}</div></Sheet>
  </main>;
}
