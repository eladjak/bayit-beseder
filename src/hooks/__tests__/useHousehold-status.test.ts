import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHousehold } from '../useHousehold';
const { single } = vi.hoisted(() => ({ single: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ createClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single }) }) }) }) }));
describe('household honesty', () => {
  beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_NEW_UI', 'true'); single.mockReset(); });
  it('has no invented invite when there is no household', async () => {
    const { result } = renderHook(() => useHousehold(null));
    await waitFor(() => expect(result.current.status).toBe('no-household'));
    expect(result.current.household.inviteCode).toBe('');
  });
  it('reports error and retries into a real household', async () => {
    single.mockResolvedValueOnce({ data: null, error: { message: 'failed' } }).mockResolvedValueOnce({ data: {name:'Home', invite_code:'REAL', golden_rule_target:80, city:null}, error:null });
    const { result } = renderHook(() => useHousehold('id'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.isReal).toBe(false);
    await act(async () => { await result.current.retry(); });
    expect(result.current.status).toBe('ready');
    expect(result.current.household.inviteCode).toBe('REAL');
  });
});

import { createElement } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { HouseholdSection } from '@/components/settings/household-section';
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key, locale: 'he' }) }));
vi.mock('@/components/ui/inline-help', () => ({ InlineHelp: () => null }));
describe('household section states', () => {
  beforeEach(() => { cleanup(); vi.stubEnv('NEXT_PUBLIC_NEW_UI', 'true'); });
  const props = { householdName:'בית', city:'', cityError:null, goldenTarget:80, inviteCode:'', copied:false, householdSaving:false, onNameChange:vi.fn(), onCityChange:vi.fn(), onTargetChange:vi.fn(), onCopyInviteCode:vi.fn(), onSave:vi.fn(), retry:vi.fn() };
  it('offers the existing invite flow and hides the code for no household', () => {
    const screen = render(createElement(HouseholdSection, {...props, status:'no-household'}));
    expect(screen.getByText('עוד אין בית משותף. אפשר ליצור אחד ולהזמין את בן או בת הזוג.')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('#invite-partner-section');
    expect(screen.queryByLabelText('settings.householdSection.copyInviteCode')).toBeNull();
  });
  it('offers retry and hides the code on error', () => {
    const retry = vi.fn(); const screen = render(createElement(HouseholdSection, {...props, status:'error', retry}));
    expect(screen.getByText('לא הצלחנו לטעון את פרטי הבית.')).toBeTruthy();
    fireEvent.click(screen.getByText('נסו שוב')); expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText('settings.householdSection.copyInviteCode')).toBeNull();
  });
});
