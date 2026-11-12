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
  it('provides a heading in the initial first-week HTML', () => {
    flags.runtime = true;
    const html = renderToStaticMarkup(<FirstWeek />);
    expect((html.match(/<h1(?:\s|>)/g) || [])).toHaveLength(1);
    expect(html).toContain('id="main-content"');
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

import { createHash } from 'node:crypto';

// Server HTML generated from origin/master at 4f943fb3, before this contract.
const masterHashes = {
  how: '20e1bb49b7a7f63ea76972270e1eecf747f7c7127b8c9d6055be14072d39a045',
  about: '5387dbbe6bc05eaa26e80a9ef8094ed91decfb2e50ea7cc68d178c7dc257c32e',
  contact: '50f33a854e25fe5c266b48bd4dcb98cbba1ed4cce2992208f4754fc20c2bca06',
  privacy: 'aafae15a42440f3da79384a4ddfe6b6dea04be8b4b70214d17787024a8e4e175',
  terms: 'df6589e93cc0dfbb09711fbbd7c8da94933fd8de1732ebfa99979f15f9877d0d',
  firstWeek: 'ff5ba28f4ece5287c547115e3a806a8dc68041e6d1e766e30f5ece29669fb1e2',
};
it.each(Object.entries({how: How, about: About, contact: Contact, privacy: Privacy, terms: Terms, firstWeek: FirstWeek}))('%s keeps master HTML with the switch off', (name, Page) => {
  flags.build = false; flags.runtime = false;
  const hash = createHash('sha256').update(renderToStaticMarkup(<Page />)).digest('hex');
  expect(hash).toBe(masterHashes[name as keyof typeof masterHashes]);
});
