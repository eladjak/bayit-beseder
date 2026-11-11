'use client';
import { useNewUi } from '@/hooks/useNewUi';
import { useCopy } from '@/hooks/useCopy';
import { Skeleton } from '@/components/v2/Skeleton';
import system from '@/lib/i18n/fragments/system';
import type { ReactNode } from 'react';
export function LoadingSwitch({ children }: { children: ReactNode }) { return useNewUi() ? <LoadingV2 /> : children; }
export function LoadingV2() { const { c } = useCopy(system); return <main className="min-h-[60dvh] bg-bb-paper p-5 md:p-8 space-y-6"><Skeleton variant="lines" lines={1} label={c('loading')} /><Skeleton variant="card" label={c('loading')} /><Skeleton variant="card" label={c('loading')} /></main>; }
