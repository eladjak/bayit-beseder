"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useHousehold } from '@/hooks/useHousehold';
import { MembersSection } from '@/components/settings/members-section';
import { DeleteAccountSection } from '@/components/settings/delete-account-section';
import { SubscriptionSection } from '@/components/settings/subscription-section';
import { checkConsent, type ConsentCheck } from '@/lib/privacy/client';
import { isPushSubscribed, requestNotificationPermission, subscribeToPush } from '@/lib/notifications';
import { settingsCopy } from '@/lib/i18n/fragments/settings';

const button = 'min-h-11 rounded-bb-md border border-bb-line-strong px-4 py-2 font-semibold text-bb-ink hover:bg-bb-card-hover focus-visible:outline-2 focus-visible:outline-bb-primary disabled:opacity-50';
const input = 'min-h-11 w-full rounded-bb-md border border-bb-line-strong bg-bb-card px-3 text-bb-ink focus-visible:outline-2 focus-visible:outline-bb-primary';
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-bb-md bg-bb-card p-5 shadow-bb-1"><h2 className="text-xl font-bold">{title}</h2>{children}</section>;
}

export default function SettingsV2() {
  const { locale } = useTranslation();
  const he = locale === 'he';
  const c = settingsCopy[locale];
  const { user } = useAuth();
  const { profile, loading: profileLoading, refetch, updateProfile } = useProfile();
  const { household, status, retry, updateHousehold } = useHousehold(profile ? profile.household_id : undefined);
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneMessage, setPhoneMessage] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [push, setPush] = useState<boolean | 'error' | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [consent, setConsent] = useState<ConsentCheck | 'loading'>('loading');
  const [theme, setTheme] = useState('system');
  function loadPush() { setPush(null); void Promise.race([isPushSubscribed(), new Promise<'error'>(resolve => window.setTimeout(() => resolve('error'), 5000))]).then(setPush).catch(() => setPush('error')); }
  useEffect(() => { void Promise.race([isPushSubscribed(), new Promise<'error'>(resolve => window.setTimeout(() => resolve('error'), 5000))]).then(setPush).catch(() => setPush('error')); const timer = window.setTimeout(() => setTheme(localStorage.getItem('bayit-beseder-theme') ?? 'system'), 0); return () => window.clearTimeout(timer); }, []);
  const loadConsent = () => { setConsent('loading'); void checkConsent().then(setConsent); };
  useEffect(() => { void checkConsent().then(setConsent); }, []);
  async function saveName() {
    if (!(name ?? household.name).trim()) { setMessage(c.homeRequired); return; }
    setSaving(true); const ok = await updateHousehold({ name: (name ?? household.name).trim() }); setSaving(false);
    setMessage(ok ? (c.homeSaved) : (c.saveFailed));
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(household.inviteCode); setMessage(c.codeCopied); }
    catch { setMessage(c.copyFailed); }
  }
  async function shareCode() {
    const text = household.inviteCode;
    try { if (navigator.share) await navigator.share({ text }); else await copyCode(); } catch { /* dismissed */ }
  }
  async function savePhone(value: string) {
    const digits = value.replace(/[\s()+-]/g, '');
    const normalized = /^05\d{8}$/.test(digits) ? `972${digits.slice(1)}` : digits;
    if (value && !/^9725\d{8}$/.test(normalized)) { setPhoneMessage(c.invalidPhone); return; }
    value = normalized;
    setPhoneSaving(true); const ok = await updateProfile({ whatsapp_phone: value.trim() || null }); setPhoneSaving(false);
    if (ok) setPhone(value.trim());
    setPhoneMessage(ok ? (c.phoneSaved) : (c.saveFailed));
  }
  async function changePush() {
    if (!user || push === null || push === 'error') return;
    setPushBusy(true);
    let ok = false;
    try {
      if (push) {
        const response = await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
        if (response.ok) { const registration = await navigator.serviceWorker.ready; const subscription = await registration.pushManager.getSubscription(); if (subscription) await subscription.unsubscribe(); ok = true; }
      } else { ok = (await requestNotificationPermission()) === 'granted' && !!(await subscribeToPush(user.id)); }
    } catch { ok = false; }
    if (ok) setPush(!push); else setPushMessage(c.pushUpdateFailed);
    setPushBusy(false);
  }
  function changeTheme(value: string) {
    setTheme(value); localStorage.setItem('bayit-beseder-theme', value);
    document.documentElement.classList.toggle('dark', value === 'dark' || (value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches));
  }
  return <main dir={he ? 'rtl' : 'ltr'} className="mx-auto max-w-3xl space-y-4 bg-bb-paper px-5 py-8 text-bb-ink sm:px-8">
    <header className="space-y-2 pb-2"><h1 className="text-3xl font-bold">{c.title}</h1><p className="text-bb-ink-2">{c.intro}</p></header>
    <Section title={c.home}>
      {profileLoading || (profile && status === 'loading') ? <p role="status">{c.homeLoading}</p> : !profile || status === 'error' ? <div role="alert"><p>{c.homeLoadFailed}</p><button className={button} onClick={() => profile ? void retry() : void refetch()}>{c.retry}</button></div> : status === 'no-household' ? <p>{c.noHousehold}</p> : <>
        <label htmlFor="home-name" className="block font-semibold">{c.homeName}</label><input id="home-name" className={input} value={name ?? household.name} onChange={e => { setName(e.target.value); setMessage(''); }} placeholder={c.homeExample} /><button className={button} disabled={saving} onClick={() => void saveName()}>{saving ? (c.saving) : (c.saveHome)}</button>
        {household.inviteCode && <div className="space-y-2 border-t border-bb-line pt-4"><p className="font-semibold">{c.inviteTitle}</p><p>{c.inviteInstruction}</p><code dir="ltr" className="block break-all">{household.inviteCode}</code><div className="flex flex-wrap gap-2"><button className={button} onClick={() => void copyCode()}>{c.copyCode}</button><button className={button} onClick={() => void shareCode()}>{c.share}</button></div></div>}
        <p role="status">{message}</p><MembersSection onInviteClick={() => void shareCode()} />
      </>}
    </Section>
    <Section title={c.notifications}><p>{c.pushInstruction}</p>{push === 'error' && <p role="alert">{c.pushCheckFailed}</p>}<button className={button} disabled={push === null || pushBusy || !user} onClick={() => push === 'error' ? loadPush() : void changePush()}>{push === null ? (c.checking) : push === 'error' ? (c.retry) : push ? (c.pushOff) : (c.pushOn)}</button><p role="status">{pushMessage}</p></Section>
    <Section title={c.agent}><p>{c.agentInstruction}</p><p>{c.agentNumberInstruction}</p><p role="status">{profile ? (profile.whatsapp_phone ? c.phonePresent : c.phoneAbsent) : profileLoading ? c.phoneStatusLoading : c.phoneStatusUnavailable}</p><label htmlFor="whatsapp-phone" className="block font-semibold">{c.phoneLabel}</label><input id="whatsapp-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" className={input} value={phone ?? profile?.whatsapp_phone ?? ''} onChange={e => { setPhone(e.target.value); setPhoneMessage(''); }} placeholder="0501234567" /><div className="flex flex-wrap gap-2"><button className={button} disabled={phoneSaving || !profile} onClick={() => void savePhone(phone ?? profile?.whatsapp_phone ?? '')}>{c.savePhone}</button><button className={button} disabled={phoneSaving || !profile?.whatsapp_phone} onClick={() => void savePhone('')}>{c.disconnect}</button></div><p role="status">{phoneMessage}</p></Section>
    <Section title={c.appearance}><p>{c.themeInstruction}</p><div className="flex flex-wrap gap-2">{(['light', 'dark', 'system'] as const).map((value, i) => <button key={value} className={`${button} ${theme === value ? 'bg-bb-primary text-bb-on-primary' : ''}`} aria-pressed={theme === value} onClick={() => changeTheme(value)}>{[c.themeLight, c.themeDark, c.themeSystem][i]}</button>)}</div></Section>
    <Section title={c.plan}><p>{c.planInstruction}</p><SubscriptionSection /></Section>
    <Section title={c.privacy}><p role="status">{consent === 'loading' ? (c.consentLoading) : consent === 'accepted' ? (c.consentAccepted) : consent === 'needed' ? (c.consentNeeded) : (c.consentError)}</p>{consent === 'error' && <button className={button} onClick={loadConsent}>{c.retry}</button>}<a className="inline-flex min-h-11 items-center text-bb-primary underline" href="/privacy">{c.privacyPolicy}</a><DeleteAccountSection /></Section>
  </main>;
}
