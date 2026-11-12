'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useShoppingCategories } from '@/hooks/useShoppingCategories';
import { useProfile } from '@/hooks/useProfile';
import { useCopy } from '@/hooks/useCopy';
import { useTranslation } from '@/hooks/useTranslation';
import { classifyItem } from '@/lib/shopping-taxonomy';
import { shoppingCopy } from '@/lib/i18n/fragments/shopping';
import { ShoppingAdd } from './ShoppingAdd';
import { Illustration } from '@/components/v2/Illustration';
import { Skeleton } from '@/components/v2/Skeleton';
import { ShoppingGroup } from './ShoppingGroup';
import { ShoppingRow } from './ShoppingRow';
import { useShoppingModel } from './useShoppingModel';
import type { ShoppingItem } from '@/hooks/useShoppingList';

export default function ShoppingV2() {
 const list = useShoppingList(); const { categories } = useShoppingCategories(); const { profile, loading: profileLoading } = useProfile(); const { locale } = useTranslation(); const { c } = useCopy(shoppingCopy);
 const [hidden, setHidden] = useState<Set<string>>(new Set()); const [failed, setFailed] = useState<Set<string>>(new Set()); const [boughtOpen, setBoughtOpen] = useState(false); const [offline, setOffline] = useState(false);
 const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>()); const removeRef = useRef(list.removeItem);
 useEffect(() => { removeRef.current = list.removeItem; }, [list.removeItem]);
 useEffect(() => { const update = () => setOffline(!navigator.onLine); update(); window.addEventListener('online', update); window.addEventListener('offline', update); const timers = pending.current; const flush = () => { for (const [id, timer] of timers) { clearTimeout(timer); removeRef.current(id); } timers.clear(); }; const visibility = () => { if (document.visibilityState === 'hidden') flush(); }; window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', visibility); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility); flush(); }; }, []);
 const visible = list.items.filter(item => !hidden.has(item.id)); const model = useShoppingModel(visible, categories);
 function toggle(id: string) { setFailed(prev => { const next = new Set(prev); next.delete(id); return next; }); try { const result = list.toggleItem(id) as unknown; Promise.resolve(result).catch(() => setFailed(prev => new Set(prev).add(id))); toast(c('checked'), { duration: 5000, actionButtonStyle: { minHeight: 44, minWidth: 44 }, action: { label: c('undo'), onClick: () => { try { Promise.resolve(list.toggleItem(id) as unknown).catch(() => setFailed(prev => new Set(prev).add(id))); } catch { setFailed(prev => new Set(prev).add(id)); } } } }); } catch { setFailed(prev => new Set(prev).add(id)); } }
 function remove(id: string) { setHidden(prev => new Set(prev).add(id)); const timer = setTimeout(() => { pending.current.delete(id); removeRef.current(id); setHidden(prev => { const next = new Set(prev); next.delete(id); return next; }); }, 5000); pending.current.set(id, timer); toast(c('deleted'), { duration: 5000, actionButtonStyle: { minHeight: 44, minWidth: 44 }, action: { label: c('undo'), onClick: () => { const active = pending.current.get(id); if (active) { clearTimeout(active); pending.current.delete(id); setHidden(prev => { const next = new Set(prev); next.delete(id); return next; }); } } } }); }
 function clearBought() { const ids = model.bought.map(item => item.id); if (!ids.length) return; setHidden(prev => new Set([...prev, ...ids])); for (const id of ids) { const timer = setTimeout(() => { pending.current.delete(id); removeRef.current(id); setHidden(prev => { const next = new Set(prev); next.delete(id); return next; }); }, 5000); pending.current.set(id, timer); } toast(c('cleared'), { duration: 5000, actionButtonStyle: { minHeight: 44, minWidth: 44 }, action: { label: c('undo'), onClick: () => { const restored: string[] = []; for (const id of ids) { const timer = pending.current.get(id); if (timer) { clearTimeout(timer); pending.current.delete(id); restored.push(id); } } setHidden(prev => { const next = new Set(prev); restored.forEach(id => next.delete(id)); return next; }); } } }); }
 async function copyList() { try { await navigator.clipboard.writeText(visible.filter(item => !item.checked).map(item => item.title).join('\n')); toast(c('copied')); } catch { toast(c('copyFailed')); } }
 const copy = { minus: c('minus'), plus: c('plus'), delete: c('delete'), deviceItem: c('deviceItem'), added: c('added'), failed: c('failed'), retry: c('retry') };
 const row = (item: ShoppingItem) => <ShoppingRow key={item.id} item={item} device={list.storage === 'device'} failed={failed.has(item.id)} copy={copy} onToggle={() => toggle(item.id)} onDelete={() => remove(item.id)} onQuantity={quantity => void list.editItem(item.id, { quantity })} />;
 return <main dir={locale === 'he' ? 'rtl' : 'ltr'} className="mx-auto max-w-3xl space-y-4 px-5 pb-28 pt-6 text-bb-ink"><header><h1 className="text-bb-2xl font-bold">{c('title')}</h1><p className="mt-1 text-bb-ink-2">{c('subtitle')}</p></header>
 {offline && <p role="status" className="rounded-bb-md bg-bb-warning-50 p-4 text-bb-warning-ink">{c('offline')}</p>}
 {!profileLoading && profile && !profile.household_id && <p role="status" className="rounded-bb-md bg-bb-primary-50 p-4">{c('noHousehold')}</p>}
 {list.storage === 'device' && <div role="alert" className="rounded-bb-md bg-bb-warning-50 p-4 text-bb-warning-ink"><p>{c('device')}</p><button type="button" disabled={list.retrying} onClick={() => void list.retry()} className="min-h-11 font-semibold underline focus-visible:outline-2 focus-visible:outline-bb-primary">{list.retrying ? c('connecting') : c('retry')}</button></div>}
 {list.storage === 'server' && list.deviceItems.length > 0 && <div className="rounded-bb-md bg-bb-warning-50 p-4 text-bb-warning-ink"><p>{c('deviceSeparate')}</p><ul>{list.deviceItems.map(item => <li key={item.id}>{item.title} · {c('deviceItem')}</li>)}</ul><button type="button" disabled={list.retrying} onClick={() => void list.retry()} className="min-h-11 underline focus-visible:outline-2 focus-visible:outline-bb-primary">{c('retry')}</button></div>}
 <ShoppingAdd locale={locale} onAdd={async title => { const result = await list.addItem(title, classifyItem(title)?.categoryName ?? 'שונות'); return result.ok ? { ok: true } : { ok: false, message: result.error }; }} />
 {visible.some(item => !item.checked) && <button type="button" onClick={() => void copyList()} className="min-h-11 rounded-bb-sm px-3 font-semibold text-bb-primary hover:bg-bb-primary-50 focus-visible:outline-2 focus-visible:outline-bb-primary">{c('copyList')}</button>}
 {list.loading ? <Skeleton variant="row" label={c('loading')} /> : visible.length === 0 ? <div className="rounded-bb-md bg-bb-card p-6 text-center"><div className="mx-auto w-40 overflow-hidden rounded-bb-md"><Illustration id="emptyShopping" sizes="160px" decorative /></div><p className="mt-4">{c('empty')}</p></div> : <div className="space-y-4">{model.groups.map(group => <ShoppingGroup key={group.name} name={group.name} count={group.items.length} open={!model.collapsed.has(group.name)} onToggle={() => model.toggle(group.name)}>{group.items.map(row)}</ShoppingGroup>)}{model.bought.length > 0 && <ShoppingGroup name={c('bought')} count={model.bought.length} open={boughtOpen} onToggle={() => setBoughtOpen(!boughtOpen)} footer={<button type="button" onClick={clearBought} className="min-h-11 px-4 font-semibold text-bb-primary hover:bg-bb-primary-50 focus-visible:outline-2 focus-visible:outline-bb-primary">{c('clearBought')}</button>}>{model.bought.map(row)}</ShoppingGroup>}</div>}
 </main>;
}
