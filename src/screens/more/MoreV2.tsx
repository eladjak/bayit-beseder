'use client';

import Link from 'next/link';
import { BookOpen, CalendarDays, ChevronLeft, History, Keyboard, Music, Printer, Settings, ShieldAlert, type LucideIcon } from 'lucide-react';
import { useCopy } from '@/hooks/useCopy';
import moreCopy from '@/lib/i18n/fragments/more';

type Item = { href: string; title: string; description: string; icon: LucideIcon };
const emergency: Item = { href: '/emergency', title: 'emergency', description: 'emergencyDesc', icon: ShieldAlert };
const groups: { title: string; items: Item[] }[] = [
  { title: 'planning', items: [
    { href: '/weekly', title: 'weekly', description: 'weeklyDesc', icon: CalendarDays },
    { href: '/history', title: 'history', description: 'historyDesc', icon: History },
    { href: '/tasks/print', title: 'print', description: 'printDesc', icon: Printer },
  ] },
  { title: 'home', items: [{ href: '/playlists', title: 'playlists', description: 'playlistsDesc', icon: Music }] },
  { title: 'account', items: [
    { href: '/settings', title: 'settings', description: 'settingsDesc', icon: Settings },
    { href: '/settings#shortcuts', title: 'shortcuts', description: 'shortcutsDesc', icon: Keyboard },
  ] },
  { title: 'reading', items: [{ href: '/blog', title: 'blog', description: 'blogDesc', icon: BookOpen }] },
];

export default function MoreV2() {
  const { c } = useCopy(moreCopy);
  function row({ href, title, description, icon: Icon }: Item, featured = false) {
    return <Link key={href} href={href} className={`flex min-h-18 items-center gap-4 px-4 py-3 text-start text-bb-ink hover:bg-bb-card-hover active:bg-bb-primary-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bb-primary ${featured ? 'bg-bb-primary-50' : 'bg-bb-card'}`}>
      <Icon className="size-6 shrink-0 text-bb-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1"><strong className="block text-base">{c(title)}</strong><p className="text-sm leading-relaxed text-bb-ink-2">{c(description)}</p></span>
      <ChevronLeft className="size-5 shrink-0 text-bb-ink-3 ltr:rotate-180" aria-hidden="true" />
    </Link>;
  }
  return <div className="mx-auto max-w-3xl space-y-7 px-4 py-8 sm:px-6">
    <header><h1 className="text-3xl font-bold text-bb-ink">{c('title')}</h1><p className="mt-2 text-bb-ink-2">{c('intro')}</p></header>
    <div className="overflow-hidden rounded-bb-md border border-bb-line">{row(emergency, true)}</div>
    {groups.map(group => <section key={group.title}><h2 className="mb-2 px-1 text-base font-bold text-bb-ink">{c(group.title)}</h2><div className="divide-y divide-bb-line overflow-hidden rounded-bb-md border border-bb-line">{group.items.map(item => row(item))}</div></section>)}
  </div>;
}
