import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GalleryPage from '../page';
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
beforeEach(() => vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview'));
afterEach(() => vi.unstubAllEnvs());
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale: 'he', t: (key: string) => key }) }));
import { galleryNames, isGalleryAllowed, missingGalleryExports } from '@/lib/i18n/fragments/gallery';
import * as kit from '@/components/v2';

describe('gallery contract', () => {
  it('blocks production even if the feature is enabled', () => {
    expect(isGalleryAllowed('production')).toBe(false);
    expect(isGalleryAllowed('preview')).toBe(true);
  });
  it.each([undefined, '', 'Production', 'staging', 'production'])('denies unknown or production environment %s', environment => {
    expect(isGalleryAllowed(environment)).toBe(false);
  });
  it.each(['preview', 'development'])('allows explicit environment %s', environment => {
    expect(isGalleryAllowed(environment)).toBe(true);
  });
  it('calls notFound in a production build', () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    expect(() => render(<GalleryPage />)).toThrow('NOT_FOUND');
  });
  it('excludes the preview from indexing and scopes v2 tokens', () => {
    const { container } = render(<GalleryPage />);
    expect(container.querySelector('[data-ui="v2"]')).not.toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  });
  it('lists every runtime kit export', () => {
    expect(missingGalleryExports(kit, galleryNames)).toEqual([]);
  });
  it('renders a heading for every export in each language', () => {
    render(<GalleryPage />);
    for (const name of Object.keys(kit)) expect(screen.getAllByRole('heading', { name })).toHaveLength(2);
  }, 15000);
  it('shows a long Hebrew button label and error and empty examples', () => {
    render(<GalleryPage />);
    expect(screen.getByRole('button', { name: /משימה ארוכה במיוחד/ })).toBeTruthy();
    expect(screen.getAllByText('צריך למלא שם').length).toBeGreaterThan(0);
    expect(screen.getAllByText('עדיין אין משימות').length).toBeGreaterThan(1);
  }, 15000);
  it('offers an error example for quick add', () => {
    render(<GalleryPage />);
    expect(screen.getByLabelText('דוגמת הוספה שנכשלת')).toBeTruthy();
  }, 15000);
  it('detects a planted unlisted export', () => {
    expect(missingGalleryExports({ ...kit, Planted: () => null }, galleryNames)).toEqual(['Planted']);
  });
});
