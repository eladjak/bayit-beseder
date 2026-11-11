'use client';
import { useEffect } from 'react';
import { CircleAlert } from 'lucide-react';
import { useCopy } from '@/hooks/useCopy';
import system from '@/lib/i18n/fragments/system';
export function ErrorV2({ error, reset, report = false }: { error: Error & { digest?: string }; reset: () => void; report?: boolean }) {
  const { c } = useCopy(system);
  useEffect(() => { if (!report) return; if (process.env.NODE_ENV === 'development') console.error('[Error Boundary]', error); const w = window as unknown as { __bbsIsChunkError?: (e: unknown) => boolean; __bbsRecover?: () => void }; if (w.__bbsIsChunkError?.(error)) w.__bbsRecover?.(); }, [error, report]);
  return <main className="min-h-dvh bg-bb-paper text-bb-ink flex items-center justify-center p-5"><div className="max-w-sm w-full space-y-6 text-center"><CircleAlert aria-hidden="true" className="mx-auto size-20 text-bb-primary" strokeWidth={1.5} /><h1 className="text-bb-xl font-bold">{c('error')}</h1><button className="min-h-12 rounded-bb-md bg-bb-primary text-bb-on-primary px-6 focus-visible:outline-2" onClick={reset}>{c('retry')}</button>{error.digest && <details><summary className="min-h-11 cursor-pointer flex items-center justify-center underline focus-visible:outline-2">{c('details')}</summary><p dir="ltr" className="break-all text-start">{error.digest}</p></details>}</div></main>;
}
