import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicPage } from '../PublicPage';

describe('public page layout', () => {
  it('provides a skip link, main target, one heading and a final action', () => {
    const html = renderToStaticMarkup(<PublicPage title="כותרת"><p>תוכן</p></PublicPage>);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expect((html.match(/<h1/g) || [])).toHaveLength(1);
    expect(html).toContain('href="/login"');
  });
  it('offers a single left-to-right email action on contact', () => {
    const html = renderToStaticMarkup(<PublicPage title="קשר" contact />);
    expect(html).toContain('href="mailto:contact@bayitbeseder.com"');
    expect(html).toContain('dir="ltr"');
  });
});

import { vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import How from '@/app/how-it-works/page';
import About from '@/app/about/page';
import Contact from '@/app/contact/page';
import Privacy from '@/app/privacy/page';
import Terms from '@/app/terms/page';
import FirstWeek from '@/app/first-week/page';
import { PolicyDocument } from '@/components/privacy/PolicyDocument';

const flags = vi.hoisted(() => ({ build: false, runtime: null as boolean | null }));
vi.mock('@/lib/ui-flag', () => ({ isNewUiBuild: () => flags.build }));
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => flags.runtime }));

describe('six public routes', () => {
  it.each([['how', How], ['about', About], ['contact', Contact], ['privacy', Privacy], ['terms', Terms]] as const)('%s has one initial heading and a valid skip target with the switch on', (_name, Page) => {
    flags.build = true;
    const html = renderToStaticMarkup(<Page />);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expect((html.match(/<h1(?:\s|>)/g) || [])).toHaveLength(1);
  });
  it.each([['privacy', Privacy], ['terms', Terms]] as const)('%s retains the exact rendered policy document', (kind, Page) => {
    flags.build = true;
    expect(renderToStaticMarkup(<Page />)).toContain(renderToStaticMarkup(<PolicyDocument kind={kind} />));
  });
  it('keeps the first week flow mounted safely as the switch changes', () => {
    flags.runtime = null;
    const result = render(<FirstWeek />);
    expect(result.container.querySelector('#main-content')).toBeNull();
    flags.runtime = true;
    result.rerender(<FirstWeek />);
    expect(result.container.querySelector('#main-content')).not.toBeNull();
    flags.runtime = false;
    result.rerender(<FirstWeek />);
    expect(result.container.querySelector('#main-content')).toBeNull();
    cleanup();
  });
});
