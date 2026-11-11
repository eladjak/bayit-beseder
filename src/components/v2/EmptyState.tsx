import type { ReactNode } from 'react';

export function EmptyState({ illustration, title, hint, action, secondary, headingLevel = 2 }: { illustration: ReactNode; title: string; hint?: string; action?: ReactNode; secondary?: ReactNode; headingLevel?: 2 | 3 | 4 | 5 | 6 }) {
  const Heading = `h${headingLevel}` as const;
  return <section className="flex flex-col items-center gap-4 text-center text-bb-ink"><div>{illustration}</div><div className="space-y-2"><Heading className="text-bb-lg font-semibold">{title}</Heading>{hint && <p className="text-bb-base text-bb-ink-2">{hint}</p>}</div>{action}{secondary}</section>;
}
