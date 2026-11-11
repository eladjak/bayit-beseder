'use client';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useCopy } from '@/hooks/useCopy';
import system from '@/lib/i18n/fragments/system';
export function InstallBannerV2() { const { canInstall, promptInstall, dismiss } = usePWAInstall(); const { c } = useCopy(system); if (!canInstall) return null; return <aside className="mx-4 my-2 rounded-bb-md bg-bb-card p-4 text-bb-ink flex flex-wrap items-center gap-3"><p className="flex-1 min-w-40">{c('install')}</p><button className="min-h-11 px-4 rounded-bb-md bg-bb-primary text-bb-on-primary focus-visible:outline-2" onClick={() => void promptInstall()}>{c('installAction')}</button><button className="min-h-11 px-4 focus-visible:outline-2" onClick={dismiss}>{c('close')}</button></aside>; }
