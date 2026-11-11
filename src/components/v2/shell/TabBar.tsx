'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCopy } from '@/hooks/useCopy';
import shell from '@/lib/i18n/fragments/shell';
import { items, isActive } from './nav-items';

export function TabBar() {
  const pathname = usePathname();
  const { c } = useCopy(shell);
  return <nav aria-label={c('navigation')} className="fixed inset-x-0 bottom-0 z-30 border-t border-bb-line bg-bb-card px-1 pb-[env(safe-area-inset-bottom)] shadow-bb-1 lg:hidden">
    <div className="flex justify-around gap-1 py-1">{items.map(({ href, key, icon: Icon }) => {
      const active = isActive(href, pathname);
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-bb-md px-1 text-bb-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary motion-safe:transition-opacity motion-safe:duration-150 active:opacity-80 ${active ? 'bg-bb-primary-50 text-bb-primary ring-1 ring-inset ring-bb-primary' : 'text-bb-ink-2 hover:bg-bb-card-hover'}`}><Icon className="size-6" aria-hidden="true"/><span>{c(key)}</span></Link>;
    })}</div>
  </nav>;
}
