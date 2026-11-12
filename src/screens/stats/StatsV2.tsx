'use client';
import {useState} from 'react';
import {useCopy} from '@/hooks/useCopy';
import {CountUp} from '@/components/v2/CountUp';
import copy from '@/lib/i18n/fragments/stats';
import {useStatsModel, type Period} from './useStatsModel';
import {StatsChart} from './StatsChart';
export default function StatsV2() {
 const {c} = useCopy(copy); const [period,setPeriod] = useState<Period>('week'); const model=useStatsModel(period);
 return <main className="mx-auto max-w-4xl space-y-5 px-5 py-6 text-bb-ink"><header><h1 className="text-bb-2xl font-bold">{c('stats')}</h1><p className="mt-1 text-bb-ink-2">{c('intro')}</p></header>
 <div className="flex gap-2" role="group" aria-label={c('stats')}>{(['week','month'] as const).map(p=><button key={p} type="button" aria-pressed={period===p} onClick={()=>setPeriod(p)} className={`min-h-11 rounded-full px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary active:scale-95 ${period===p?'bg-bb-primary text-bb-on-primary':'bg-bb-card text-bb-ink hover:bg-bb-card-hover'}`}>{c(p)}</button>)}</div>
 {model.loading ? <p role="status">{c('loading')}</p> : model.error ? <div role="alert"><p>{c('error')}</p><button onClick={model.retry} className="min-h-11 rounded-bb-md px-4 text-bb-primary hover:bg-bb-primary-50 focus-visible:outline-2">{c('retry')}</button></div> : model.noHousehold ? <p>{c('noHousehold')}</p> : !model.data?.total ? <p className="rounded-bb-md bg-bb-card p-5">{c('empty')}</p> : <><section className="rounded-bb-lg bg-bb-card p-6 shadow-bb-1"><p className="text-bb-lg font-bold">{c(period==='week'?'togetherWeek':'togetherMonth',{count:model.data.total})}</p><p className="mt-2 text-bb-2xl font-bold" aria-hidden="true"><CountUp value={model.data.total}/></p></section><StatsChart title={c('dayChart')} items={model.data.days}/>{model.data.rooms.length>0 && <StatsChart title={c('roomChart')} items={model.data.rooms}/>}</>}
 </main>;
}
