import type { CategoryKey } from '@/lib/categories';
const colors: Record<CategoryKey, string> = { kitchen: 'bg-bb-honey', bathroom: 'bg-bb-sky', living: 'bg-bb-mint', bedroom: 'bg-bb-coral', laundry: 'bg-bb-sky', outdoor: 'bg-bb-mint', pets: 'bg-bb-peach', general: 'bg-bb-honey' };
export function RoomMark({ room, name }: { room: CategoryKey; name: string }) {
  return <span className="inline-flex items-center gap-2 text-bb-sm text-bb-ink"><span aria-hidden="true" className={`h-5 w-1 rounded-full ${colors[room] ?? 'bg-bb-honey'}`} />{name}</span>;
}
