'use client';

import { useEffect, useState } from 'react';
import { useCopy } from '@/hooks/useCopy';
import system from '@/lib/i18n/fragments/system';

export function UpdateToastV2() {
  const { c } = useCopy(system);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let poll: number | undefined;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'SW_UPDATED') return;
      const showWhenSafe = () => {
        if (document.querySelector('[aria-modal="true"]')) return;
        window.clearInterval(poll);
        setVisible(true);
      };
      window.clearInterval(poll);
      showWhenSafe();
      if (document.querySelector('[aria-modal="true"]')) poll = window.setInterval(showWhenSafe, 400);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => { navigator.serviceWorker.removeEventListener('message', onMessage); window.clearInterval(poll); };
  }, []);
  if (!visible) return null;
  return <aside role="status" className="mx-4 my-2 flex flex-wrap items-center gap-3 rounded-bb-md bg-bb-card p-4 text-bb-ink"><p className="min-w-40 flex-1">{c('update')}</p><button className="min-h-11 rounded-bb-md bg-bb-primary px-4 text-bb-on-primary focus-visible:outline-2" onClick={() => window.location.reload()}>{c('refresh')}</button><button className="min-h-11 px-4 focus-visible:outline-2" onClick={() => setVisible(false)}>{c('close')}</button></aside>;
}
