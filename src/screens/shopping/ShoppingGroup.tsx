import { Apple, Beef, ChevronDown, Milk, ShoppingBasket, SprayCan, Wheat } from 'lucide-react';
import { RoomMark } from '@/components/v2/RoomMark';
import type { ReactNode } from 'react';
export function ShoppingGroup({ name, count, open, onToggle, children, footer }: { name: string; count: number; open: boolean; onToggle: () => void; children: ReactNode; footer?: ReactNode }) {
 const Icon = /ירק|פרי|פירות/.test(name) ? Apple : /חלב|גבינ/.test(name) ? Milk : /מאפ|דגנ|לחם/.test(name) ? Wheat : /בשר|דגים|עוף/.test(name) ? Beef : /ניקיון|היגיינה|טיפוח/.test(name) ? SprayCan : ShoppingBasket;
 return <section className="overflow-hidden rounded-bb-md bg-bb-card shadow-bb-1"><button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-12 w-full items-center justify-between gap-4 px-4 text-start font-semibold hover:bg-bb-card-hover active:bg-bb-primary-50 focus-visible:outline-2 focus-visible:outline-bb-primary"><span className="flex items-center gap-2"><Icon aria-hidden="true" className="size-5" /><RoomMark room="kitchen" name={name} /><span className="tabular-nums">({count})</span></span><ChevronDown aria-hidden="true" className={`size-5 motion-safe:transition-transform motion-safe:duration-150 ${open ? 'rotate-180' : ''}`} /></button>{open && <><ul className="px-3">{children}</ul>{footer}</>}</section>;
}
