// @vitest-environment jsdom
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import MoreV2 from '../MoreV2';
import MorePage from '@/app/(app)/more/page';

let flag: boolean | null = false;
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => flag }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale: 'he' }) }));
vi.mock('@/hooks/useCopy', () => ({ useCopy: (copy: { he: Record<string, string> }) => ({ c: (key: string) => copy.he[key] }) }));
afterEach(cleanup);

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? pages(path) : entry.name === 'page.tsx' ? [path] : [];
  });
}
function routeFile(href: string): string | undefined {
  const [route, anchor] = href.split('#');
  return pages(join(process.cwd(), 'src/app')).find(file => {
    const relative = file.slice(join(process.cwd(), 'src/app').length).replace(/\/\([^/]+\)/g, '').replace(/\/page\.tsx$/, '') || '/';
    if (relative !== route) return false;
    if (!anchor) return true;
    const pattern = new RegExp(`id=["']${anchor}["']`);
    if (pattern.test(readFileSync(file, 'utf8'))) return true;
    const root = join(process.cwd(), 'src/app');
    for (let dir = dirname(file); dir.startsWith(root); dir = dirname(dir)) {
      const layout = join(dir, 'layout.tsx');
      if (existsSync(layout) && pattern.test(readFileSync(layout, 'utf8'))) return true;
      if (dir === root) break;
    }
    return false;
  });
}

describe('More redesign', () => {
  it('lists only existing routes and anchors', () => {
    render(<MoreV2 />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(routeFile(link.getAttribute('href')!), link.getAttribute('href')!).toBeTruthy();
  });
  it('links to the household tools anchor supplied by the app layout', () => {
    render(<MoreV2 />);
    expect(screen.getAllByRole('link').find(link => link.getAttribute('href') === '/more#house-tools')).toBeTruthy();
  });
  it('places the emergency link first, with real descriptive links', () => {
    render(<MoreV2 />);
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/emergency');
    for (const link of links) expect(link.querySelector('strong') && link.querySelector('p')).toBeTruthy();
  });
  it('keeps the old page when off and survives null to true to false', () => {
    flag = null;
    const { rerender } = render(<MorePage />);
    expect(screen.getByText('יום עמוס? מצב חירום')).toBeTruthy();
    flag = true; rerender(<MorePage />);
    expect(screen.getByRole('link', { name: /יום עמוס/ }).getAttribute('href')).toBe('/emergency');
    flag = false; rerender(<MorePage />);
    expect(screen.getByText('יום עמוס? מצב חירום')).toBeTruthy();
  });
});
