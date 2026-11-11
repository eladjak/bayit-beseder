export function Skeleton({ variant, label, lines = 3 }: { variant: 'lines' | 'card' | 'row'; label: string; lines?: number }) {
  return <div role="status"><span className="sr-only">{label}</span><div aria-hidden="true" className={`space-y-2 motion-safe:animate-pulse ${variant === 'card' ? 'rounded-bb-md bg-bb-card p-4' : ''}`} >{variant === 'row' && <div className="size-10 rounded-full bg-bb-line" />}{Array.from({ length: variant === 'lines' ? Math.max(1, lines) : 2 }, (_, i) => <div key={i} className={`h-4 rounded-bb-sm bg-bb-line ${i === 1 ? 'w-2/3' : 'w-full'}`} />)}</div></div>;
}
