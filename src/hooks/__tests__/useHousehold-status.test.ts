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

it('keeps the honest placeholder when the redesign switch is off', async () => {
  vi.stubEnv('NEXT_PUBLIC_NEW_UI', 'false');
  const { result } = renderHook(() => useHousehold(null));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.household.inviteCode).toBe('');
});

describe('review regressions', () => {
  beforeEach(() => { cleanup(); vi.stubEnv('NEXT_PUBLIC_NEW_UI', 'true'); single.mockReset(); });
  it('keeps unknown profile loading rather than claiming no home', () => {
    const { result } = renderHook(() => useHousehold(undefined));
    expect(result.current.status).toBe('loading');
  });
  it('treats a missing household as no household', async () => {
    single.mockResolvedValue({data:null, error:{code:'PGRST116'}});
    const {result} = renderHook(() => useHousehold('missing'));
    await waitFor(() => expect(result.current.status).toBe('no-household'));
  });
  it('ignores an obsolete household response', async () => {
    let resolveOld!: (value: unknown) => void;
    single.mockImplementationOnce(() => new Promise(resolve => {resolveOld = resolve;})).mockResolvedValueOnce({data:{name:'New',invite_code:'NEW'},error:null});
    const {result, rerender} = renderHook(({id}) => useHousehold(id), {initialProps:{id:'old'}});
    rerender({id:'new'});
    await waitFor(() => expect(result.current.household.name).toBe('New'));
    await act(async () => resolveOld({data:{name:'Old',invite_code:'OLD'},error:null}));
    expect(result.current.household.name).toBe('New');
  });
  it('does not permit saving placeholder fields after an error', () => {
    const save = vi.fn();
    const screen = render(createElement(HouseholdSection, {householdName:'בית', city:'', cityError:null, goldenTarget:80, inviteCode:'', copied:false, householdSaving:false, onNameChange:vi.fn(), onCityChange:vi.fn(), onTargetChange:vi.fn(), onCopyInviteCode:vi.fn(), onSave:save, retry:vi.fn(), status:'error'}));
    expect(screen.queryByText('settings.householdSection.saveHousehold')).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
});

it('does not offer copying an empty invitation code', () => {
  cleanup(); vi.stubEnv('NEXT_PUBLIC_NEW_UI', 'true');
  const screen = render(createElement(HouseholdSection, {householdName:'בית', city:'', cityError:null, goldenTarget:80, inviteCode:'', copied:false, householdSaving:false, onNameChange:vi.fn(), onCityChange:vi.fn(), onTargetChange:vi.fn(), onCopyInviteCode:vi.fn(), onSave:vi.fn(), retry:vi.fn(), status:'ready'}));
  expect(screen.queryByLabelText('settings.householdSection.copyInviteCode')).toBeNull();
});
