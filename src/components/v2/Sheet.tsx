'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './index-a';

export type OverlayProps = { open: boolean; title: string; onClose: () => void; children: ReactNode };
let locks = 0;
let previousOverflow = '';

export function Overlay({ open, title, onClose, children, centered = false }: OverlayProps & { centered?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const backdropPointer = useRef(false);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (locks++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (--locks === 0) document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [open]);
  return <dialog ref={ref} tabIndex={-1} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onPointerDown={(event) => { backdropPointer.current = event.target === event.currentTarget; }}
    onClick={(event) => { if (backdropPointer.current && event.target === event.currentTarget) onClose(); backdropPointer.current = false; }}
    className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border-0 rounded-bb-lg bg-bb-card p-0 text-bb-ink shadow-bb-3 backdrop:bg-black/50 ${centered ? '' : 'max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:m-0 max-sm:max-h-[90dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none motion-safe:max-sm:transition-[translate,opacity] motion-safe:max-sm:duration-[320ms] motion-safe:max-sm:starting:translate-y-full motion-safe:max-sm:starting:opacity-0'}`}>
    <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
      {!centered && <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-bb-ink-4 sm:hidden" />}
      <div className="flex items-center justify-between gap-4"><h2 id={titleId} className="text-xl font-bold">{title}</h2><IconButton label="סגירה" onClick={onClose}><X aria-hidden="true" size={20} /></IconButton></div>
      {children}
    </div>
  </dialog>;
}
export function Sheet(props: OverlayProps) { return <Overlay {...props} />; }
