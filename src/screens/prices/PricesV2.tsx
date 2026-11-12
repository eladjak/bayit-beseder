'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import { useHousehold } from '@/hooks/useHousehold';
import { useCopy } from '@/hooks/useCopy';
import copy from '@/lib/i18n/fragments/prices';
import type { CompareResponse } from '@/lib/prices/types';
import { formatDayIL, formatMoney, storeKey } from '@/components/prices/format';
import { CandidatesSheet, type Candidate } from '@/components/prices/candidates-sheet';

type State = {kind:'loading'|'city'|'denied'|'error'|'empty'} | {kind:'ready'; data:CompareResponse};
type City = {name:string; stores:number};
const key = 'bayit.prices.city';
const button = 'min-h-11 rounded-xl px-4 py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600';
export default function PricesV2() {
 const {c} = useCopy(copy);
 const {profile, loading: profileLoading} = useProfile();
 const {household, loading: householdLoading, updateHousehold} = useHousehold(profile?.household_id);
 const [state,setState] = useState<State>({kind:'loading'});
 const [city,setCity] = useState(''); const [picker,setPicker] = useState(false); const [cities,setCities] = useState<City[]>([]); const [cityError,setCityError] = useState(false); const [citiesLoading,setCitiesLoading] = useState(false); const [search,setSearch] = useState('');
 const [sheet,setSheet] = useState<{key:string; canonicalId:string}|null>(null); const [notice,setNotice] = useState(''); const [saving,setSaving] = useState(false); const started = useRef(false);
 const compare = useCallback(async (name:string) => {
  setState({kind:'loading'});
  try { const res = await fetch(`/api/prices/compare?${new URLSearchParams(name ? {city:name} : {})}`); const body = await res.json().catch(() => ({}));
   if (res.ok) { setState({kind:'ready',data:body as CompareResponse}); return; }
   if (res.status===404 && body.error==='not found') { setState({kind:'denied'}); return; }
   if (res.status===400 && body.error==='need_location') { setState({kind:'city'}); setPicker(true); return; }
   if (res.status===400 && body.error==='empty_list') { setState({kind:'empty'}); return; }
   setState({kind:'error'});
  } catch { setState({kind:'error'}); }
 },[]);
 const loadCities = useCallback(async () => { setCityError(false); setCitiesLoading(true); try { const r=await fetch('/api/prices/cities'); if (!r.ok) throw Error(); const body=await r.json(); setCities(body.cities ?? []); } catch { setCityError(true); } finally { setCitiesLoading(false); } },[]);
 useEffect(() => { if (profileLoading || householdLoading || started.current) return; started.current=true; let saved=''; try { saved=localStorage.getItem(key) || ''; } catch {} const initial=saved || household.city || ''; setCity(initial); void compare(initial); },[profileLoading,householdLoading,household.city,compare]);
 useEffect(() => { if (picker) void loadCities(); },[picker,loadCities]);
 async function pickCity(name:string) { setCity(name); setPicker(false); try { localStorage.setItem(key,name); } catch {} if (profile?.household_id && household.city!==name) void updateHousehold({city:name}); await compare(name); }
 async function pin(id:string,candidate:Candidate|null) { if (saving) return; setSaving(true); setNotice(''); try { const r=await fetch('/api/prices/pin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(candidate ? {canonicalId:id,itemCode:candidate.code,chain:candidate.chain,name:candidate.name} : {canonicalId:id,itemCode:null})}); if(!r.ok) throw Error(); setSheet(null); setNotice(c(candidate ? 'saved':'undone')); await compare(city); } catch { setNotice(c('pinError')); } finally {setSaving(false);} }
 const data=state.kind==='ready' ? state.data : null;
 const winner=data?.verdict ? [...data.ranked,...data.otherStores].find(s=>storeKey(s)===data.verdict?.storeKey) : undefined;
 const unavailable=data && data.ranked.length===0 && data.otherStores.length===0;
 const itemStore=winner ?? data?.ranked[0] ?? data?.otherStores[0];
 useEffect(() => { if (unavailable) void loadCities(); },[unavailable,loadCities]);
 return <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-28 text-gray-900 dark:text-gray-100">
  <Link href="/shopping" className={`${button} inline-flex items-center underline`}>{c('back')}</Link>
  <h1 className="text-2xl font-bold">{c('title')}</h1>
  {state.kind !== 'denied' && <>
   {picker ? <section className="rounded-2xl border border-gray-200 bg-surface p-4 dark:border-gray-700"><h2 className="text-lg font-bold">{c('choose')}</h2><label className="mt-3 block" htmlFor="price-city">{c('search')}</label><input id="price-city" value={search} onChange={e=>setSearch(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-gray-400 bg-transparent px-3"/><ul className="mt-2 max-h-64 overflow-auto">{cities.filter(x=>x.name.includes(search)).map(x=><li key={x.name}><button className={`${button} w-full text-start hover:bg-emerald-50 dark:hover:bg-gray-800`} onClick={()=>void pickCity(x.name)}>{x.name}</button></li>)}</ul>{citiesLoading && <p role="status">{c('loading')}</p>}{!citiesLoading && !cityError && cities.filter(x=>x.name.includes(search)).length===0 && <p>{c('noCities')}</p>}{cityError && <><p role="alert">{c('cityError')}</p><button className={button} onClick={()=>void loadCities()}>{c('retry')}</button></>}</section> : <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-surface p-3 dark:border-gray-700"><span>{c('city')}: {city}</span><button className={`${button} underline`} onClick={()=>setPicker(true)}>{c('change')}</button></div>}
   {state.kind==='loading' && <p role="status">{c('loading')}</p>}
   {state.kind==='error' && <div role="alert"><p>{c('error')}</p><button className={`${button} mt-2 bg-emerald-700 text-white`} onClick={()=>void compare(city)}>{c('retry')}</button></div>}
   {state.kind==='empty' && <p>{c('empty')}</p>}
   {notice && <p role="status">{notice}</p>}
   {unavailable && <section><p>{c('unavailable')}</p>{cities.length>0 && <p className="mt-2">{c('available')}: {cities.map(x=>x.name).join(', ')}</p>}</section>}
   {data && !unavailable && <>
    <section className="rounded-2xl border border-emerald-300 bg-[#ecfdf5] p-5 text-[#111827] dark:border-emerald-800 dark:bg-[#022c22] dark:text-[#f3f4f6]"><h2 className="font-semibold">{winner && data.verdict ? c('winner') : c('noVerdict')}</h2>{winner && data.verdict && <><p className="mt-2 text-xl font-bold">{winner.chainName} {winner.name}</p><p className="mt-2 tabular-nums">{c('saving',{amount:formatMoney(data.verdict.savingVsDearest)})}</p>{data.verdict.basis==='common' && <p>{c('partial')}</p>}<p className="mt-2 text-sm">{c('source',{chain:winner.chainName,date:formatDayIL(winner.published) ?? c('unknownDate')})}</p></>}</section>
    {itemStore && <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-surface dark:divide-gray-700 dark:border-gray-700">{data.items.map(item=>{const line=itemStore.lines[item.key]; return <li key={item.key} className="p-4"><p className="font-semibold">{data.titles[item.key] ?? item.key}</p>{line ? <><p>{line.name}</p><p className="tabular-nums">{formatMoney(line.cost)}</p></> : <p>{c('unmatched')}</p>}{item.canonicalId && <button className={`${button} mt-1 border border-gray-400`} disabled={saving} onClick={()=>item.pinned ? void pin(item.canonicalId!,null) : setSheet({key:item.key,canonicalId:item.canonicalId!})}>{c(item.pinned ? 'undo':'pick')}</button>}</li>})}</ul>}
    <p className="text-sm text-gray-600 dark:text-gray-400">{c('disclaimer')}</p>
   </>}
  </>}
  {state.kind==='denied' && <p>{c('denied')}</p>}
  {sheet && data && <div className="[&_button]:min-h-11"><CandidatesSheet title={data.titles[sheet.key] ?? sheet.key} canonicalId={sheet.canonicalId} onChoose={candidate=>void pin(sheet.canonicalId,candidate)} onClose={()=>setSheet(null)}/></div>}
 </main>;
}
