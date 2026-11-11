'use client';
import { useEffect, useState } from 'react';
import { useCopy } from '@/hooks/useCopy';
import system from '@/lib/i18n/fragments/system';
export function OfflineV2({ pendingCount = 0, dismiss }: { pendingCount?: number; dismiss?: () => void }) {
 const { c } = useCopy(system);
 return <section role="status" className="bg-bb-paper text-bb-ink p-5 space-y-4"><h1 className="font-bold text-bb-xl">{c('offline')}</h1><p>{c('offlineDetail')}</p>{pendingCount > 0 && <p>{c('pending')}</p>}<div className="flex flex-wrap gap-3"><button className="min-h-12 rounded-bb-md bg-bb-primary text-bb-on-primary px-6 focus-visible:outline-2" onClick={() => window.location.reload()}>{c('retry')}</button>{dismiss && <button className="min-h-12 px-4 focus-visible:outline-2" onClick={dismiss}>{c('close')}</button>}</div></section>;
}

function queueCount(): number {
  try { const data = JSON.parse(localStorage.getItem('bayit-offline-queue') || '[]'); return Array.isArray(data) ? data.length : 0; } catch { return 0; }
}
export function OfflineIndicatorV2({ pendingCount }: { pendingCount?: number }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  useEffect(() => {
    const update = () => setLocalCount(queueCount());
    const on = () => { setOnline(true); setDismissed(false); };
    const off = () => { setOnline(false); setDismissed(false); update(); };
    update();
    const interval = window.setInterval(update, 2000);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.clearInterval(interval); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return !online && !dismissed ? <OfflineV2 pendingCount={pendingCount ?? localCount} dismiss={() => setDismissed(true)} /> : null;
}
