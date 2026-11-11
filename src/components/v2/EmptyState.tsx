import type { ReactNode } from 'react';

export function EmptyState({ illustration, title, hint, action, secondary }: { illustration: ReactNode; title: string; hint?: string; action?: ReactNode; secondary?: ReactNode }) {
  return <section className="flex flex-col items-center gap-4 text-center text-bb-ink"><div>{illustration}</div><div className="space-y-2"><p className="text-bb-lg font-semibold">{title}</p>{hint && <p className="text-bb-base text-bb-ink-2">{hint}</p>}</div>{action}{secondary}</section>;
}
