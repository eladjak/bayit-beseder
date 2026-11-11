import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomNav } from '@/components/bottom-nav';
let pathname = '/dashboard';
let enabled: boolean | null = true;
let locale = 'he';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => enabled }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale }) }));
vi.mock('@/hooks/useCopy', () => ({ useCopy: (fragment: {he: Record<string,string>; en: Record<string,string>}) => ({ c: (key: string) => fragment[locale === 'en' ? 'en' : 'he'][key] }) }));
afterEach(() => { cleanup(); enabled = true; locale = 'he'; });
describe('shell', () => {
  it.each(['/more','/weekly','/stats','/settings','/history','/emergency','/playlists'])('selects More for %s', path => { pathname = path; render(<BottomNav />); for (const nav of screen.getAllByRole('navigation')) { const selected = nav.querySelectorAll('[aria-current="page"]'); expect(selected).toHaveLength(1); expect(selected[0].getAttribute('href')).toBe('/more'); } });
  it.each([['/dashboard','/dashboard'],['/tasks/123','/tasks'],['/shopping','/shopping'],['/meals','/meals']])('selects %s', (path, href) => { pathname = path; render(<BottomNav />); for (const nav of screen.getAllByRole('navigation')) expect(nav.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe(href); });
  it('renders original classes for off and unknown', () => { for (const flag of [false, null]) { enabled = flag; pathname = '/dashboard'; const { unmount } = render(<BottomNav />); expect(screen.getByRole('navigation').className).toContain('bg-surface px-1'); expect(screen.getByRole('link', { name: 'היום' }).className).toContain('bg-primary/10 text-primary'); unmount(); } });
  it.each([['he','היום'],['en','Today']])('renders v2 labels in %s', (language, label) => { locale = language; pathname = '/dashboard'; render(<BottomNav />); expect(screen.getAllByRole('link', { name: label })).toHaveLength(2); expect(screen.getAllByRole('navigation')).toHaveLength(2); for (const link of screen.getAllByRole('link', { name: label })) expect(link.className).toContain('min-h-14'); });
});
