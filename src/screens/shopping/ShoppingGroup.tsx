import { ChevronDown } from 'lucide-react';
import { RoomMark } from '@/components/v2/RoomMark';
import type { ReactNode } from 'react';
export function ShoppingGroup({ name, open, onToggle, children }: { name: string; open: boolean; onToggle: () => void; children: ReactNode }) {
 return <section className="overflow-hidden rounded-bb-md bg-bb-card shadow-bb-1"><button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-12 w-full items-center justify-between gap-4 px-4 text-start font-semibold hover:bg-bb-card-hover active:bg-bb-primary-50 focus-visible:outline-2 focus-visible:outline-bb-primary"><RoomMark room="kitchen" name={name} /><ChevronDown aria-hidden="true" className={`size-5 motion-safe:transition-transform motion-safe:duration-150 ${open ? 'rotate-180' : ''}`} /></button>{open && <ul className="px-3">{children}</ul>}</section>;
}
