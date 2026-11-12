'use client';
import {useCopy} from '@/hooks/useCopy';
import {useLanguage} from '@/components/LanguageProvider';
import copy from '@/lib/i18n/fragments/stats';
import {useHistoryModel} from './useHistoryModel';
export default function HistoryV2() {
 const {c}=useCopy(copy); const {locale}=useLanguage(); const model=useHistoryModel();
 const dateLocale=locale==='en'?'en-GB':'he-IL';
 return <main className="mx-auto max-w-4xl space-y-5 px-5 py-6 text-bb-ink"><header><h1 className="text-bb-2xl font-bold">{c('history')}</h1><p className="mt-1 text-bb-ink-2">{c('intro')}</p></header>
 {model.loading ? <p role="status">{c('loading')}</p> : model.error ? <div role="alert"><p>{c('error')}</p><button onClick={model.retry} className="min-h-11 rounded-bb-md px-4 text-bb-primary hover:bg-bb-primary-50 focus-visible:outline-2">{c('retry')}</button></div> : model.noHousehold ? <p>{c('noHousehold')}</p> : model.groups.length===0 ? <p className="rounded-bb-md bg-bb-card p-5">{c('historyEmpty')}</p> : <div className="space-y-5">{model.groups.map(group=><section key={group.day}><h2 className="mb-2 text-bb-lg font-bold">{new Intl.DateTimeFormat(dateLocale,{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${group.day}T00:00:00Z`))}</h2><ul className="space-y-2">{group.entries.map(entry=><li key={entry.id} className="rounded-bb-md bg-bb-card p-4"><p className="font-semibold">{model.tasks[entry.task_id] || c('unknownTask')}</p><p className="text-bb-ink-2">{model.people[entry.completed_by || entry.user_id] || c('unknownPerson')} · {c('time')} <time dateTime={entry.completed_at} dir="ltr">{new Intl.DateTimeFormat(dateLocale,{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit'}).format(new Date(entry.completed_at))}</time></p></li>)}</ul></section>)}{model.more && <button onClick={model.loadMore} className="min-h-11 rounded-bb-md bg-bb-primary px-5 text-bb-on-primary hover:bg-bb-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95">{c('more')}</button>}</div>}
 </main>;
}
