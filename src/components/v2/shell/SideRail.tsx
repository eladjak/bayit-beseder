'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCopy } from '@/hooks/useCopy';
import shell from '@/lib/i18n/fragments/shell';
import { items, isActive } from './nav-items';

export function SideRail() {
  const pathname = usePathname();
  const { c } = useCopy(shell);
  return <nav data-v2-rail aria-label={c('navigation')} className="fixed inset-y-0 start-0 z-30 hidden w-56 border-e border-bb-line bg-bb-card px-4 pt-8 shadow-bb-1 lg:block">
    <style>{`@media (min-width: 1024px) {
      :root[data-ui="v2"][dir="ltr"] div:has(> nav[data-v2-rail]) {
        padding-inline-start: 14rem;
        padding-inline-end: 0;
      }
    }`}</style>
    <div className="px-3 pb-8 text-xl font-bold text-bb-ink">{c('brand')}</div>
    <div className="flex flex-col gap-1">{items.map(({ href, key, icon: Icon }) => {
      const active = isActive(href, pathname);
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-14 items-center gap-3 rounded-bb-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary motion-safe:transition-opacity motion-safe:duration-150 active:opacity-80 ${active ? 'bg-bb-primary-50 text-bb-primary' : 'text-bb-ink-2 hover:bg-bb-card-hover'}`}><Icon className="size-6" aria-hidden="true"/><span>{c(key)}</span></Link>;
    })}</div>
  </nav>;
}
