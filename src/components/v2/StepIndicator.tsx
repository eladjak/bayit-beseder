export function StepIndicator({ current, total, label }: { current: number; total: number; label: string }) {
  return <div className="space-y-2 text-bb-sm text-bb-ink-2"><p>{label}</p><div className="flex gap-2">{Array.from({ length: Math.max(0, total) }, (_, i) => <span key={i} aria-current={i + 1 === current ? 'step' : undefined} className={`size-2 rounded-full ${i + 1 === current ? 'bg-bb-primary' : 'bg-bb-line-strong'}`} />)}</div></div>;
}
