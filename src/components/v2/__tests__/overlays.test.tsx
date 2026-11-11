import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Sheet } from '../Sheet';
import { Dialog } from '../Dialog';
import { showToast } from '../toast';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); this.querySelector('button')?.focus(); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe.each([['Sheet', Sheet], ['Dialog', Dialog]] as const)('%s', (_name, Component) => {
  it('opens modally with its title as accessible name and restores focus after Escape', async () => {
    const opener = document.createElement('button'); document.body.append(opener); opener.focus();
    const onClose = vi.fn();
    const { rerender } = render(<Component open title="בדיקה" onClose={onClose}>תוכן</Component>);
    const dialog = screen.getByRole('dialog', { name: 'בדיקה' });
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    expect(onClose).toHaveBeenCalled();
    rerender(<Component open={false} title="בדיקה" onClose={onClose}>תוכן</Component>);
    await waitFor(() => expect(document.activeElement).toBe(opener));
    opener.remove();
  });
  it('closes from backdrop and the visible close button', () => {
    const onClose = vi.fn(); render(<Component open title="בדיקה" onClose={onClose}>תוכן</Component>);
    fireEvent.pointerDown(screen.getByRole('dialog')); fireEvent.click(screen.getByRole('dialog')); fireEvent.click(screen.getByRole('button', { name: 'סגירה' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
it('calls undo and reports a failed undo', async () => {
  const undo = vi.fn().mockResolvedValue(false);
  showToast({ message: 'נשמר', tone: 'success', undo });
  const options = vi.mocked(toast).mock.calls[0][1]!;
  const action = options.action as { onClick: (event: React.MouseEvent<HTMLButtonElement>) => void };
  action.onClick({} as React.MouseEvent<HTMLButtonElement>);
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(undo).toHaveBeenCalledOnce();
});

it('holds the scroll lock until the last overlay closes and restores the original overflow', () => {
  document.body.style.overflow = 'scroll';
  const a = render(<Sheet open title="א" onClose={() => {}}>א</Sheet>);
  const b = render(<Dialog open title="ב" onClose={() => {}}>ב</Dialog>);
  expect(document.body.style.overflow).toBe('hidden');
  a.unmount();
  expect(document.body.style.overflow).toBe('hidden');
  b.unmount();
  expect(document.body.style.overflow).toBe('scroll');
  document.body.style.overflow = '';
});

it('inherits the direction of the document', () => {
  document.documentElement.dir = 'ltr';
  render(<Sheet open title="Test" onClose={() => {}}>Test</Sheet>);
  expect(screen.getByRole('dialog').closest('[dir]')).toBe(document.documentElement);
  document.documentElement.dir = '';
});

it('configures toast duration, target size, tone and rejected undo', async () => {
  showToast({ message: 'Test', tone: 'error', undo: () => Promise.reject(new Error('failed')) });
  const options = vi.mocked(toast).mock.calls[0][1]!;
  expect(options.duration).toBe(5000);
  expect(options.classNames?.actionButton).toContain('min-h-11');
  expect(options.classNames?.actionButton).toContain('min-w-11');
  expect(options.className).toBe(options.classNames?.error);
  const action = options.action as { onClick: (event: React.MouseEvent<HTMLButtonElement>) => void };
  action.onClick({} as React.MouseEvent<HTMLButtonElement>);
  await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
});
