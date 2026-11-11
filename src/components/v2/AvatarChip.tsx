const pairs = [
  'bg-bb-honey-50 text-bb-ink', 'bg-bb-peach-50 text-bb-ink', 'bg-bb-coral-50 text-bb-ink',
  'bg-bb-sky-50 text-bb-ink', 'bg-bb-mint-50 text-bb-ink', 'bg-bb-primary-50 text-bb-ink',
] as const;
function colorFor(id: string) { let hash = 0; for (const char of id) hash = (Math.imul(hash, 31) + char.codePointAt(0)!) >>> 0; return hash % pairs.length; }
export function AvatarChip({ id, name, size = 'md', shared = false, sharedLabel }: { id: string; name: string; size?: 'sm' | 'md'; shared?: boolean; sharedLabel?: string }) {
  const color = colorFor(id); const display = shared ? (sharedLabel ?? name) : name;
  return <span className="inline-flex items-center gap-2 text-bb-ink"><span aria-hidden="true" data-avatar-color={color} className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${size === 'sm' ? 'size-8 text-bb-sm' : 'size-10 text-bb-base'} ${pairs[color]}`}>{Array.from(display.trim())[0] ?? ''}</span><span className={size === 'sm' ? 'text-bb-sm' : 'text-bb-base'}>{display}</span></span>;
}
