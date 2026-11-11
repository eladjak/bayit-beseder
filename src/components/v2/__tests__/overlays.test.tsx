import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Sheet } from '../Sheet';
import { Dialog } from '../Dialog';
import { showToast } from '../toast';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
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
    fireEvent.click(screen.getByRole('dialog')); fireEvent.click(screen.getByRole('button', { name: 'סגירה' }));
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
