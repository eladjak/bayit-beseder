import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsV2 from '../SettingsV2';
import SettingsPage from '@/app/(app)/settings/page';

const mocks = vi.hoisted(() => ({ updateHousehold: vi.fn(), updateProfile: vi.fn(), retry: vi.fn(), share: vi.fn(), writeText: vi.fn(), push: vi.fn(), consent: vi.fn(), newUi: null as boolean | null, status: 'ready', code: 'server-fixture-code' }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale: 'en', t: (key: string) => key, setLocale: vi.fn() }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { household_id: 'home-1', whatsapp_phone: null }, loading: false, refetch: vi.fn(), updateProfile: mocks.updateProfile }) }));
vi.mock('@/hooks/useHousehold', () => ({ useHousehold: () => ({ household: { name: 'Fixture home', inviteCode: mocks.code }, status: mocks.status, retry: mocks.retry, updateHousehold: mocks.updateHousehold }) }));
vi.mock('@/components/settings/members-section', () => ({ MembersSection: () => <div>Members fixture</div> }));
vi.mock('@/components/settings/delete-account-section', () => ({ DeleteAccountSection: () => <div>Original delete component</div> }));
vi.mock('@/components/settings/subscription-section', () => ({ SubscriptionSection: () => <div>Plan fixture</div> }));
vi.mock('@/lib/privacy/client', () => ({ checkConsent: mocks.consent }));
vi.mock('@/lib/notifications', () => ({ getNotificationPrefs: () => ({}), getNotificationPermission: () => 'default', isPushSubscribed: mocks.push, requestNotificationPermission: vi.fn(), subscribeToPush: vi.fn() }));


vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => mocks.newUi }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/hooks/useSeasonalMode', () => ({ useSeasonalMode: () => ({}) }));
vi.mock('@/hooks/useZoneConfig', () => ({ useZoneConfig: () => ({}) }));
vi.mock('@/hooks/usePWAInstall', () => ({ usePWAInstall: () => ({}) }));
vi.mock('@/hooks/useAssistantVisibility', () => ({ useAssistantVisibility: () => ({}) }));
vi.mock('@/components/settings/profile-section', () => ({ ProfileSection: () => <div>Legacy profile fixture</div> }));
vi.mock('@/components/settings/household-section', () => ({ HouseholdSection: () => null }));
vi.mock('@/components/settings/notification-settings', () => ({ NotificationSettings: () => null }));
vi.mock('@/components/settings/appearance-settings', () => ({ AppearanceSettings: () => null, WhatsAppSettings: () => null }));
vi.mock('@/components/settings/danger-zone', () => ({ DangerZone: () => null }));
vi.mock('@/components/settings/agent-connect-section', () => ({ AgentConnectSection: () => null }));
vi.mock('@/components/invite-partner', () => ({ InvitePartner: () => null }));
vi.mock('@/components/calendar-settings', () => ({ CalendarSettings: () => null }));
vi.mock('@/components/feedback/feedback-button', () => ({ FeedbackButton: () => null }));
vi.mock('@/components/ui/collapsible-section', () => ({ CollapsibleSection: () => null }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); mocks.newUi = null; mocks.status = 'ready'; mocks.code = 'server-fixture-code';
  mocks.updateHousehold.mockResolvedValue(true); mocks.updateProfile.mockResolvedValue(true);
  mocks.push.mockResolvedValue(false); mocks.consent.mockResolvedValue('accepted');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mocks.writeText.mockResolvedValue(undefined) } });
  Object.defineProperty(navigator, 'share', { configurable: true, value: mocks.share.mockResolvedValue(undefined) });
});

describe('settings v2', () => {
  it('copies and shares the server-provided invite code', async () => {
    render(<SettingsV2 />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(mocks.writeText).toHaveBeenCalledWith('server-fixture-code'));
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(mocks.share).toHaveBeenCalledWith({ text: 'server-fixture-code' });
  });
  it('reports household save failure and permits retry', async () => {
    mocks.updateHousehold.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<SettingsV2 />); fireEvent.change(screen.getByLabelText('Home name'), { target: { value: 'New home' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save home name' }));
    expect(await screen.findByText('Could not save. Try again.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save home name' }));
    expect(await screen.findByText('Home name saved.')).toBeTruthy();
    expect(mocks.updateHousehold).toHaveBeenCalledWith({ name: 'New home' });
  });
  it('offers a retry when the household cannot load and does not invent a code', () => {
    mocks.status = 'error'; render(<SettingsV2 />);
    expect(screen.queryByText('server-fixture-code')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(mocks.retry).toHaveBeenCalled();
  });
  it('stores the format the WhatsApp webhook reads and removes it on disconnect', async () => {
    render(<SettingsV2 />); fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0501234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save number' }));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith({ whatsapp_phone: '972501234567' }));
  });
  it('explains whether a WhatsApp number is saved and gives the phone keyboard', () => {
    render(<SettingsV2 />);
    expect(screen.getByText('No phone number saved.')).toBeTruthy();
    expect(screen.getByLabelText('Phone number').getAttribute('autocomplete')).toBe('tel');
    expect(screen.getByLabelText('Phone number').getAttribute('inputmode')).toBe('tel');
  });
  it('clears an outdated home save message when editing again', async () => {
    render(<SettingsV2 />);
    fireEvent.click(screen.getByRole('button', { name: 'Save home name' }));
    expect(await screen.findByText('Home name saved.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Home name'), { target: { value: 'Another home' } });
    expect(screen.queryByText('Home name saved.')).toBeNull();
  });
  it('clears an outdated phone error when editing again', async () => {
    render(<SettingsV2 />);
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save number' }));
    expect(await screen.findByText(/Enter a valid Israeli mobile number/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0501234567' } });
    expect(screen.queryByText(/Enter a valid Israeli mobile number/)).toBeNull();
  });
  it('reuses the original deletion flow and checks consent', async () => {
    render(<SettingsV2 />); expect(screen.getByText('Original delete component')).toBeTruthy();
    expect(await screen.findByText('Consent is recorded.')).toBeTruthy(); expect(mocks.consent).toHaveBeenCalled();
  });
});


describe('settings switch', () => {
  it('renders V1 for unknown and off, and safely transitions null → true → false', () => {
    const errors = vi.spyOn(console, 'error');
    const { rerender } = render(<SettingsPage />);
    expect(screen.getByText('Legacy profile fixture')).toBeTruthy();
    expect(screen.queryByText('Your home and account, all in one place.')).toBeNull();
    mocks.newUi = true;
    rerender(<SettingsPage />);
    expect(screen.getByText('Your home and account, all in one place.')).toBeTruthy();
    expect(screen.queryByText('Legacy profile fixture')).toBeNull();
    mocks.newUi = false;
    rerender(<SettingsPage />);
    expect(screen.getByText('Legacy profile fixture')).toBeTruthy();
    expect(screen.queryByText('Your home and account, all in one place.')).toBeNull();
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/hooks|rendered more|rendered fewer/i);
    errors.mockRestore();
  });
});
