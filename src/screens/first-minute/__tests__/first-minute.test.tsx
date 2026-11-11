import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FirstMinute } from '../FirstMinute';
import { FIRST_TASK, isQuietTime } from '../useFirstMinute';
import { ConversationalOnboarding } from '@/components/onboarding/conversational-onboarding';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { WelcomeGiftModal } from '@/components/welcome-gift';

const mock = vi.hoisted(() => ({ seed: vi.fn(), complete: vi.fn(), query: vi.fn(), insert: vi.fn(), createTask: vi.fn(), flag: null as boolean | null, refresh: vi.fn() }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale: 'en', t: (key: string) => key }) }));
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => mock.flag }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { id: 'user', household_id: 'home' } }) }));
vi.mock('@/hooks/useCompletions', () => ({ useCompletions: () => ({ markComplete: mock.complete }) }));
vi.mock('@/lib/first-run-seed', () => ({ runStarterSeed: mock.seed }));
vi.mock('@/components/SupabaseProvider', () => ({ useSupabase: () => ({ from: (table: string) => ({ select: () => ({ eq: () => table === 'tasks' ? { eq: () => ({ limit: () => mock.query('tasks') }) } : { limit: () => mock.query('shopping') } }), insert: table === 'tasks' ? (...args: unknown[]) => ({ select: () => ({ single: () => mock.createTask(...args) }) }) : mock.insert }) }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mock.refresh }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); mock.seed.mockResolvedValue({ ok: true, seeded: true }); mock.query.mockImplementation((table: string) => Promise.resolve({ data: table === 'tasks' ? [{ id: 'task', title: FIRST_TASK.title }] : [], error: null })); mock.insert.mockResolvedValue({ error: null }); });
afterEach(cleanup);
async function focusStep() { render(<FirstMinute />); fireEvent.click(screen.getByRole('button', { name: 'A couple' })); }
async function firstWin() { await focusStep(); fireEvent.click(screen.getByRole('button', { name: 'Prepare my home' })); await screen.findByText('Your home is ready'); fireEvent.click(screen.getByRole('button', { name: 'Show me' })); }
describe('first minute', () => {
  it('announces each new step by focusing its heading and shows progress through the flow', async () => {
    render(<FirstMinute />);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Who lives here?' }));
    fireEvent.click(screen.getByRole('button', { name: 'A couple' }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'What matters this week?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prepare my home' }));
    await screen.findByText('Your home is ready');
    expect(screen.getByText('Step 3 of 4')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Your home is ready' }))); 
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
    expect(screen.getByText('Step 4 of 4')).toBeTruthy();
  });

  it('saves the chosen household type in the existing household preference', () => { render(<FirstMinute />); fireEvent.click(screen.getByRole('button', { name: 'Just me' })); expect(JSON.parse(localStorage.getItem('bayit-household-type-v1') || '{}').type).toBe('solo'); });
  it('starts with a thirty second task', () => expect(FIRST_TASK.estimatedMinutes).toBe(0.5));
  it('offers a retry and never shows ready if the seed fails', async () => { mock.seed.mockResolvedValueOnce({ ok: false }); await focusStep(); fireEvent.click(screen.getByRole('button', { name: 'Prepare my home' })); expect((await screen.findByRole('alert')).textContent).toContain("couldn't prepare"); expect(screen.queryByText('Your home is ready')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(await screen.findByText('Your home is ready')).toBeTruthy(); });
  it('waits for real completion before welcoming or offering an invite', async () => { let resolve!: (value: unknown) => void; mock.complete.mockReturnValue(new Promise(r => { resolve = r; })); await firstWin(); fireEvent.click(screen.getByRole('button', { name: 'Done' })); expect(screen.queryByText('A little start, a warmer home')).toBeNull(); expect(screen.queryByText('Make home a team effort')).toBeNull(); expect(localStorage.getItem('bayit-beseder-onboarding-done')).toBeNull(); resolve({ id: 'completion' }); await screen.findByText('A little start, a warmer home'); expect(localStorage.getItem('bayit-beseder-onboarding-done')).toBe('true'); expect(localStorage.getItem('bayit-first-minute-invite')).toBe('1'); cleanup(); render(<FirstMinute />); expect(screen.getByText('Make home a team effort')).toBeTruthy(); });
  it('continues to Today with the invitation without a page reload', async () => { mock.complete.mockResolvedValue({ id: 'completion' }); await firstWin(); fireEvent.click(screen.getByRole('button', { name: 'Done' })); await screen.findByText('A little start, a warmer home'); fireEvent.click(screen.getByRole('button', { name: 'Continue to Today' })); expect(screen.getByText('Make home a team effort')).toBeTruthy(); expect(mock.refresh).toHaveBeenCalledOnce(); });
  it('keeps the task open and offers retry if completion is rejected', async () => { mock.complete.mockResolvedValue(null); await firstWin(); fireEvent.click(screen.getByRole('button', { name: 'Done' })); expect((await screen.findByRole('alert')).textContent).toContain("Couldn't save completion"); expect(screen.queryByText('A little start, a warmer home')).toBeNull(); expect(localStorage.getItem('bayit-beseder-onboarding-done')).toBeNull(); });
  it('uses the selected focus to choose starter tasks', async () => { await focusStep(); fireEvent.click(screen.getByRole('button', { name: 'Laundry' })); fireEvent.click(screen.getByRole('button', { name: 'Prepare my home' })); await screen.findByText('Your home is ready'); expect(mock.seed.mock.calls[0][1].some((task: {category: string}) => task.category === 'laundry')).toBe(true); });
  it('creates a first-win task when an existing household has none on this device', async () => { mock.seed.mockResolvedValue({ ok: true, seeded: false }); mock.query.mockResolvedValue({ data: [], error: null }); mock.createTask.mockResolvedValue({ data: { id: 'new-first-task' }, error: null }); await focusStep(); fireEvent.click(screen.getByRole('button', { name: 'Prepare my home' })); await screen.findByText('Your home is ready'); expect(mock.createTask).toHaveBeenCalledOnce(); });
  it('does not claim readiness when shopping fails', async () => { mock.insert.mockResolvedValueOnce({ error: { message: 'offline' } }); await focusStep(); fireEvent.click(screen.getByRole('button', { name: 'Prepare my home' })); await screen.findByRole('alert'); expect(screen.queryByText('Your home is ready')).toBeNull(); });
  it('shows text confirmation without animation at night or on Friday evening', async () => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date('2026-12-04T16:00:00Z')); mock.complete.mockResolvedValue({ id: 'completion' }); await firstWin(); fireEvent.click(screen.getByRole('button', { name: 'Done' })); await screen.findByText('A little start, a warmer home'); expect(document.querySelector('canvas, video, audio, img')).toBeNull(); vi.useRealTimers(); });
});


describe('switch wrappers', () => {
  it('does not show or seed onboarding for an existing household when the dashboard keeps it closed', () => { mock.flag = true; render(<ConversationalOnboarding open={false} onComplete={vi.fn()} onSkip={vi.fn()} />); expect(screen.queryByRole('dialog')).toBeNull(); expect(mock.seed).not.toHaveBeenCalled(); });
  it('shows onboarding for an eligible new household when the dashboard opens it', () => { mock.flag = true; render(<ConversationalOnboarding open onComplete={vi.fn()} onSkip={vi.fn()} />); expect(screen.getByText('Who lives here?')).toBeTruthy(); });
  it('keeps old components for null and false, hides them for true, and tolerates toggles', () => {
    const callbacks = { onClose: vi.fn(), onComplete: vi.fn() };
    mock.flag = null;
    const view = render(<><OnboardingWizard open {...callbacks} /><ConversationalOnboarding open onComplete={vi.fn()} onSkip={vi.fn()} /><WelcomeGiftModal /></>);
    expect(view.container.textContent).not.toBe('');
    const originalMarkup = view.container.innerHTML;
    mock.flag = true;
    view.rerender(<><OnboardingWizard open {...callbacks} /><ConversationalOnboarding open onComplete={vi.fn()} onSkip={vi.fn()} /><WelcomeGiftModal /></>);
    expect(screen.getByText('Who lives here?')).toBeTruthy();
    expect(view.container.textContent).not.toContain('onboarding.welcome');
    mock.flag = false;
    view.rerender(<><OnboardingWizard open {...callbacks} /><ConversationalOnboarding open onComplete={vi.fn()} onSkip={vi.fn()} /><WelcomeGiftModal /></>);
    expect(screen.queryByText('Who lives here?')).toBeNull();
    expect(view.container.innerHTML).toBe(originalMarkup);
  });
});

describe('Israel quiet times', () => {
  it('uses text-only confirmation at 23:00 in Israel and on a December Friday evening', () => {
    expect(isQuietTime(new Date('2026-12-08T21:00:00Z'))).toBe(true);
    expect(isQuietTime(new Date('2026-12-04T16:00:00Z'))).toBe(true);
    expect(isQuietTime(new Date('2026-12-08T10:00:00Z'))).toBe(false);
  });
});
