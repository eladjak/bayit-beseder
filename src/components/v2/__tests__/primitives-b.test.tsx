// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(cleanup);
describe('feedback and display primitives', () => {
  it('EmptyState renders the illustration and action slots', async () => { const { EmptyState } = await import('../EmptyState'); render(<EmptyState title="אין משימות" illustration={<span>איור</span>} action={<button>הוספה</button>} />); expect(screen.getByRole('heading', { name: 'אין משימות', level: 2 })).toBeTruthy(); expect(screen.getByText('איור')).toBeTruthy(); expect(screen.getByRole('button', {name:'הוספה'})).toBeTruthy(); });
  it('Notice announces errors and allows dismissal', async () => { const { Notice } = await import('../Notice'); const dismiss = vi.fn(); render(<Notice tone="error" onDismiss={dismiss} dismissLabel="סגירה">נסו שוב</Notice>); expect(screen.getByRole('alert').textContent).toContain('נסו שוב'); screen.getByRole('button', {name:'סגירה'}).click(); expect(dismiss).toHaveBeenCalledOnce(); });
  it('Skeleton exposes a loading label and hides decorative shapes', async () => { const { Skeleton } = await import('../Skeleton'); render(<Skeleton variant="lines" label="טוען…" />); expect(screen.getByText('טוען…')).toBeTruthy(); expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy(); });
  it('StepIndicator marks the current step', async () => { const { StepIndicator } = await import('../StepIndicator'); render(<StepIndicator current={2} total={3} label="שלב 2 מתוך 3" />); expect(screen.getByText('שלב 2 מתוך 3')).toBeTruthy(); expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1); });
  it('AvatarChip gives stable and varied colours', async () => { const { AvatarChip } = await import('../AvatarChip'); const ids = ['550e8400-e29b-41d4-a716-446655440000','6ba7b810-9dad-11d1-80b4-00c04fd430c8','123e4567-e89b-12d3-a456-426614174000','a987fbc9-4bed-4078-8f07-9141ba07c9f3','f47ac10b-58cc-4372-a567-0e02b2c3d479','3d813cbb-47fb-32ba-91df-831e1593ac29']; const {container, rerender} = render(<AvatarChip id="a" name="אור" />); const color = container.querySelector('[data-avatar-color]')?.getAttribute('data-avatar-color'); rerender(<AvatarChip id="a" name="אור" />); expect(container.querySelector('[data-avatar-color]')?.getAttribute('data-avatar-color')).toBe(color); const colors = ids.map(id => { rerender(<AvatarChip id={id} name="אור" />); return container.querySelector('[data-avatar-color]')?.getAttribute('data-avatar-color'); }); expect(new Set(colors).size).toBeGreaterThanOrEqual(5); });
  it('RoomMark includes a room name', async () => { const { RoomMark } = await import('../RoomMark'); render(<RoomMark room="kitchen" name="מטבח" />); expect(screen.getByText('מטבח')).toBeTruthy(); });
  it('CountUp exposes only the final value to accessibility and is instant for reduced motion', async () => { vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })); const { CountUp } = await import('../CountUp'); render(<CountUp value={42} />); expect(screen.getByText('42', {selector:'.sr-only'})).toBeTruthy(); expect(screen.getByText('42', {selector:'[aria-hidden="true"]'})).toBeTruthy(); expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1); vi.unstubAllGlobals(); });
  it.each(['info', 'warning', 'success'] as const)('Notice %s uses status and has no dismiss button without a handler', async tone => {
    const { Notice } = await import('../Notice');
    render(<Notice tone={tone}>עדכון</Notice>);
    expect(screen.getByRole('status').textContent).toContain('עדכון');
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('CountUp preserves final accessible text throughout offscreen animation', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    let intersect!: (entries: Partial<IntersectionObserverEntry>[]) => void;
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: typeof intersect) { intersect = callback; } observe() {} disconnect() {} });
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 1000, bottom: 1020, left: 0, right: 20, width: 20, height: 20, x: 0, y: 1000, toJSON() {} });
    const now = vi.spyOn(performance, 'now').mockReturnValue(100);
    const { CountUp } = await import('../CountUp');
    const { container, unmount } = render(<CountUp value={42} />);
    act(() => intersect([{ isIntersecting: true }]));
    act(() => frames.shift()!(400));
    expect(container.querySelector('.sr-only')?.textContent).toBe('42');
    expect(Number(container.querySelector('[aria-hidden="true"]')?.textContent)).toBeLessThan(42);
    act(() => frames.shift()!(700));
    expect(container.querySelector('.sr-only')?.textContent).toBe('42');
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('42');
    unmount(); rect.mockRestore(); now.mockRestore(); vi.unstubAllGlobals();
  });
  it('CountUp does not reset an initially visible number', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    let intersect!: (entries: Partial<IntersectionObserverEntry>[]) => void;
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: typeof intersect) { intersect = callback; } observe() {} disconnect() {} });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 10, bottom: 30, left: 0, right: 20, width: 20, height: 20, x: 0, y: 10, toJSON() {} });
    const { CountUp } = await import('../CountUp');
    const { container, unmount } = render(<CountUp value={42} />);
    if (intersect) act(() => intersect([{ isIntersecting: true }]));
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('42');
    unmount(); rect.mockRestore(); vi.unstubAllGlobals();
  });

});
