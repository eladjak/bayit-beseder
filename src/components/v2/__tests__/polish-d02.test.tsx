import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button } from '../Button';
import { TabBar } from '../shell/TabBar';
import { SideRail } from '../shell/SideRail';
import { showToast } from '../toast';
import { toast } from 'sonner';
import { isGalleryAllowed } from '@/lib/i18n/fragments/gallery';
vi.mock('next/navigation', () => ({ usePathname: () => '/tasks/123' }));
vi.mock('@/hooks/useCopy', () => ({ useCopy: (f: {he: Record<string,string>}) => ({c: (key: string) => f.he[key]}) }));
vi.mock('sonner', () => ({toast: Object.assign(vi.fn(), {error: vi.fn()})}));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllEnvs(); document.documentElement.lang = ''; });
it('keeps wrapped button labels readable with vertical breathing room', () => {
  render(<Button>כפתור עם תווית ארוכה במיוחד</Button>);
  expect(screen.getByRole('button').className).toContain('leading-[1.45]');
  expect(screen.getByRole('button').className).toContain('py-3');
});
it('chooses undo language from the page even when focus is in another language', () => {
  document.documentElement.lang = 'en';
  const focused = document.createElement('button'); focused.lang = 'he'; document.body.appendChild(focused); focused.focus();
  showToast({message:'Saved', tone:'success', undo:async()=>true});
  expect((vi.mocked(toast).mock.calls[0][1]!.action as {label:string}).label).toBe('Undo');
  focused.remove();
});
it('marks the current page in both navigation surfaces', () => {
  render(<><TabBar/><SideRail/></>);
  for (const nav of screen.getAllByRole('navigation')) {
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(nav.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/tasks');
  }
});
it('allows local development while explicitly denying production', () => {
  vi.stubEnv('NODE_ENV','development');
  expect(isGalleryAllowed(undefined)).toBe(true);
  expect(isGalleryAllowed('production')).toBe(false);
});
