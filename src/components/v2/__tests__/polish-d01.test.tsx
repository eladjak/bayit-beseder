import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button } from '../Button';
import { QuickAdd } from '../QuickAdd';
import { isGalleryAllowed } from '@/lib/i18n/fragments/gallery';
import { showToast } from '../toast';
import { toast } from 'sonner';
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));
vi.mock('@/components/voice-input-button', () => ({ VoiceInputButton: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); document.documentElement.lang = ''; vi.unstubAllEnvs(); });
describe('D-01 polish', () => {
  it('allows local development but denies production even in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isGalleryAllowed(undefined)).toBe(true);
    expect(isGalleryAllowed('production')).toBe(false);
  });
  it('preserves readable button text during loading and disabled states', () => {
    render(<><Button loading>Loading</Button><Button disabled>Disabled</Button></>);
    expect(screen.getByRole('button', { name: 'Loading' }).querySelector('.opacity-0')).toBeNull();
    expect(screen.getByRole('button', { name: 'Disabled' }).className).not.toContain('disabled:opacity-50');
  });
  it('shows a filled action for QuickAdd', () => {
    render(<QuickAdd label="Task" placeholder="Task" submitLabel="Add" errorMessage="Error" savedMessage="Saved" onSubmit={async () => ({ok:true})} />);
    expect(screen.getByRole('button', {name:'Add'}).className.split(/\s+/)).toContain('bg-bb-primary');
  });
  it('uses a quiet action and localizes undo', () => {
    document.documentElement.lang = 'en';
    showToast({message:'Saved',tone:'success',undo:async()=>true});
    const options = vi.mocked(toast).mock.calls[0][1]!;
    expect((options.action as {label:string}).label).toBe('Undo');
    expect(options.classNames?.actionButton).toContain('bg-bb-card');
  });
});

it('uses the icon set in gallery icon buttons', async () => {
  const { readFileSync } = await import('node:fs');
  const gallery = readFileSync('src/app/%5F%5Fui/page.tsx', 'utf8');
  expect(gallery).toContain('<Plus aria-hidden="true"');
  expect(gallery).not.toMatch(/<IconButton[^>]*>\+<\/IconButton>/);
});
it('blends illustration paper in light mode while keeping dark images legible', async () => {
  const { readFileSync } = await import('node:fs');
  const illustration = readFileSync('src/components/v2/Illustration.tsx', 'utf8');
  expect(illustration).toContain('mix-blend-multiply dark:mix-blend-normal');
});
