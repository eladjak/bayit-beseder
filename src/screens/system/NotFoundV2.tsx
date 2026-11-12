'use client';
import Link from 'next/link';
import { useNewUi } from '@/hooks/useNewUi';
import { useCopy } from '@/hooks/useCopy';
import { Illustration } from '@/components/v2/Illustration';
import system from '@/lib/i18n/fragments/system';
import type { ReactNode } from 'react';
export function NotFoundSwitch({ children }: { children: ReactNode }) { return useNewUi() ? <NotFoundV2 /> : children; }
export function NotFoundV2() {
  const { c } = useCopy(system);
  return <main className="min-h-dvh bg-bb-paper text-bb-ink flex items-center justify-center p-5"><div className="w-full max-w-sm space-y-6 text-center"><div className="mix-blend-multiply dark:mix-blend-normal"><Illustration id="welcomeHome" sizes="(max-width: 640px) 80vw, 384px" decorative /></div><h1 className="text-bb-xl font-bold">{c('missing')}</h1><div className="flex flex-wrap justify-center gap-3"><Link className="min-h-12 px-6 rounded-bb-md bg-bb-primary text-bb-on-primary inline-flex items-center focus-visible:outline-2" href="/dashboard">{c('today')}</Link><button className="min-h-12 px-6 rounded-bb-md border border-bb-line-strong focus-visible:outline-2" onClick={() => window.history.back()}>{c('back')}</button></div></div></main>;
}
