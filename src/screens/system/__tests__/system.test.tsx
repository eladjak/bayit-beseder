import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ErrorV2 } from '../ErrorV2';
import { OfflineV2 } from '../OfflineV2';
vi.mock('sonner', () => ({ toast: vi.fn() }));

describe('system screens', () => {
  it('retries and exposes only the digest', () => {
    const reset = vi.fn();
    const error = Object.assign(new Error('private stack'), { digest: 'safe-id' });
    render(<ErrorV2 error={error} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'נסו שוב' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByText('safe-id')).toBeTruthy();
    expect(document.body.textContent).not.toContain('private stack');
  });
  it('explains offline limitations without promising synchronization', () => {
    render(<OfflineV2 />);
    expect(screen.getByText(/לא כל הפעולות זמינות ללא חיבור/)).toBeTruthy();
  });
});

it('shows when actions remain on this device while offline', async () => {
  const { OfflineIndicatorV2 } = await import('../OfflineV2');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  localStorage.setItem('bayit-offline-queue', JSON.stringify([{ id: 'one' }]));
  render(<OfflineIndicatorV2 />);
  expect(await screen.findByText(/פעולות שממתינות במכשיר/)).toBeTruthy();
  localStorage.removeItem('bayit-offline-queue');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

const flag = vi.hoisted(() => ({ value: null as boolean | null }));
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => flag.value }));
it('keeps the old app error at null and false and switches without hook errors', async () => {
  const { default: AppError } = await import('../../../app/(app)/error');
  const props = { error: new Error('hidden'), reset: vi.fn() };
  flag.value = null;
  const view = render(<AppError {...props} />);
  expect(screen.getByRole('link', { name: /דשבורד/ })).toBeTruthy();
  flag.value = true; view.rerender(<AppError {...props} />);
  expect(screen.getByText('משהו לא הסתדר. אפשר לנסות שוב.')).toBeTruthy();
  flag.value = false; view.rerender(<AppError {...props} />);
  expect(screen.getByRole('link', { name: /דשבורד/ })).toBeTruthy();
});

it('replaces the legacy update toast when the flag turns on and restores it when off', async () => {
  const { ServiceWorkerUpdateToast } = await import('@/components/ServiceWorkerUpdateToast');
  const worker = new EventTarget();
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: worker });
  flag.value = null;
  const view = render(<ServiceWorkerUpdateToast />);
  flag.value = true;
  view.rerender(<ServiceWorkerUpdateToast />);
  worker.dispatchEvent(new MessageEvent('message', { data: { type: 'SW_UPDATED' } }));
  expect(await screen.findByText('יש גרסה חדשה לבית בסדר.')).toBeTruthy();
  flag.value = false;
  view.rerender(<ServiceWorkerUpdateToast />);
  expect(screen.queryByText('יש גרסה חדשה לבית בסדר.')).toBeNull();
});

it('shows the legacy update signal while the switch is off', async () => {
  const { toast } = await import('sonner');
  const { ServiceWorkerUpdateToast } = await import('@/components/ServiceWorkerUpdateToast');
  const worker = new EventTarget();
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: worker });
  flag.value = false;
  render(<ServiceWorkerUpdateToast />);
  vi.mocked(toast).mockClear();
  worker.dispatchEvent(new MessageEvent('message', { data: { type: 'SW_UPDATED' } }));
  expect(toast).toHaveBeenCalledOnce();
  expect(screen.queryByText('יש גרסה חדשה לבית בסדר.')).toBeNull();
});

it('shows no pending message when the offline queue is empty', () => {
  render(<OfflineV2 pendingCount={0} />);
  expect(screen.queryByText(/פעולות שממתינות במכשיר/)).toBeNull();
});

it('loading uses accessible skeletons', async () => {
  const { LoadingV2 } = await import('../LoadingV2');
  render(<LoadingV2 />);
  expect(screen.getAllByText('טוענים את התוכן').length).toBeGreaterThan(0);
});


it('offers installation and remembers dismissal', async () => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
  const { InstallBannerV2 } = await import('../InstallBannerV2');
  localStorage.removeItem('bayit-beseder-pwa-install-dismissed');
  localStorage.removeItem('bayit-beseder-pwa-install-dismissed-until');
  render(<InstallBannerV2 />);
  act(() => { window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })); });
  expect(screen.getByRole('button', { name: 'התקנה' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'סגירה' }));
  expect(screen.queryByRole('button', { name: 'התקנה' })).toBeNull();
  expect(localStorage.getItem('bayit-beseder-pwa-install-dismissed')).toBeTruthy();
  localStorage.removeItem('bayit-beseder-pwa-install-dismissed');
  localStorage.removeItem('bayit-beseder-pwa-install-dismissed-count');
});
