import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsV2 from '../SettingsV2';

const mocks = vi.hoisted(() => ({ updateHousehold: vi.fn(), updateProfile: vi.fn(), retry: vi.fn(), share: vi.fn(), writeText: vi.fn(), push: vi.fn(), consent: vi.fn(), status: 'ready', code: 'server-fixture-code' }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale: 'en' }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { household_id: 'home-1', whatsapp_phone: null }, loading: false, refetch: vi.fn(), updateProfile: mocks.updateProfile }) }));
vi.mock('@/hooks/useHousehold', () => ({ useHousehold: () => ({ household: { name: 'Fixture home', inviteCode: mocks.code }, status: mocks.status, retry: mocks.retry, updateHousehold: mocks.updateHousehold }) }));
vi.mock('@/components/settings/members-section', () => ({ MembersSection: () => <div>Members fixture</div> }));
vi.mock('@/components/settings/delete-account-section', () => ({ DeleteAccountSection: () => <div>Original delete component</div> }));
vi.mock('@/components/settings/subscription-section', () => ({ SubscriptionSection: () => <div>Plan fixture</div> }));
vi.mock('@/lib/privacy/client', () => ({ checkConsent: mocks.consent }));
vi.mock('@/lib/notifications', () => ({ isPushSubscribed: mocks.push, requestNotificationPermission: vi.fn(), subscribeToPush: vi.fn() }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); mocks.status = 'ready'; mocks.code = 'server-fixture-code';
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
  it('reuses the original deletion flow and checks consent', async () => {
    render(<SettingsV2 />); expect(screen.getByText('Original delete component')).toBeTruthy();
    expect(await screen.findByText('Consent is recorded.')).toBeTruthy(); expect(mocks.consent).toHaveBeenCalled();
  });
});
