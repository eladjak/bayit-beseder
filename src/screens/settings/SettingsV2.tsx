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
    if (!(name ?? household.name).trim()) { setMessage(he ? 'יש להזין שם לבית.' : 'Enter a name for your home.'); return; }
    setSaving(true); const ok = await updateHousehold({ name: (name ?? household.name).trim() }); setSaving(false);
    setMessage(ok ? (he ? 'שם הבית נשמר.' : 'Home name saved.') : (he ? 'לא הצלחנו לשמור. נסו שוב.' : 'Could not save. Try again.'));
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(household.inviteCode); setMessage(he ? 'הקוד הועתק.' : 'Code copied.'); }
    catch { setMessage(he ? 'לא הצלחנו להעתיק. אפשר לסמן ולהעתיק את הקוד.' : 'Could not copy. Select and copy the code.'); }
  }
  async function shareCode() {
    const text = household.inviteCode;
    try { if (navigator.share) await navigator.share({ text }); else await copyCode(); } catch { /* dismissed */ }
  }
  async function savePhone(value: string) {
    const digits = value.replace(/[\s()+-]/g, '');
    const normalized = /^05\d{8}$/.test(digits) ? `972${digits.slice(1)}` : digits;
    if (value && !/^9725\d{8}$/.test(normalized)) { setPhoneMessage(he ? 'יש להזין מספר נייד ישראלי תקין, למשל 0501234567.' : 'Enter a valid Israeli mobile number, for example 0501234567.'); return; }
    value = normalized;
    setPhoneSaving(true); const ok = await updateProfile({ whatsapp_phone: value.trim() || null }); setPhoneSaving(false);
    if (ok) setPhone(value.trim());
    setPhoneMessage(ok ? (he ? 'המספר נשמר.' : 'Number saved.') : (he ? 'לא הצלחנו לשמור. נסו שוב.' : 'Could not save. Try again.'));
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
    if (ok) setPush(!push); else setPushMessage(he ? 'לא הצלחנו לעדכן התראות. בדקו את הרשאות המכשיר ונסו שוב.' : 'Could not update notifications. Check device permissions and try again.');
    setPushBusy(false);
  }
  function changeTheme(value: string) {
    setTheme(value); localStorage.setItem('bayit-beseder-theme', value);
    document.documentElement.classList.toggle('dark', value === 'dark' || (value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches));
  }
  return <main dir={he ? 'rtl' : 'ltr'} className="mx-auto max-w-3xl space-y-4 bg-bb-paper px-5 py-8 text-bb-ink sm:px-8">
    <header className="space-y-2 pb-2"><h1 className="text-3xl font-bold">{c.title}</h1><p className="text-bb-ink-2">{c.intro}</p></header>
    <Section title={c.home}>
      {profileLoading || (profile && status === 'loading') ? <p role="status">{he ? 'טוענים את פרטי הבית...' : 'Loading home details...'}</p> : !profile || status === 'error' ? <div role="alert"><p>{he ? 'לא הצלחנו לטעון את פרטי הבית.' : 'Could not load home details.'}</p><button className={button} onClick={() => profile ? void retry() : void refetch()}>{he ? 'נסו שוב' : 'Try again'}</button></div> : status === 'no-household' ? <p>{he ? 'עוד אין בית משותף.' : 'There is no shared home yet.'}</p> : <>
        <label htmlFor="home-name" className="block font-semibold">{he ? 'שם הבית' : 'Home name'}</label><input id="home-name" className={input} value={name ?? household.name} onChange={e => setName(e.target.value)} placeholder={he ? 'למשל: הבית שלנו' : 'For example: Our home'} /><button className={button} disabled={saving} onClick={() => void saveName()}>{saving ? (he ? 'שומרים...' : 'Saving...') : (he ? 'שמירת שם הבית' : 'Save home name')}</button>
        {household.inviteCode && <div className="space-y-2 border-t border-bb-line pt-4"><p className="font-semibold">{he ? 'הזמנה לבית' : 'Invite to your home'}</p><p>{he ? 'שלחו את הקוד למי שתרצו להזמין.' : 'Send this code to someone you want to invite.'}</p><code dir="ltr" className="block break-all">{household.inviteCode}</code><div className="flex flex-wrap gap-2"><button className={button} onClick={() => void copyCode()}>{he ? 'העתקת הקוד' : 'Copy code'}</button><button className={button} onClick={() => void shareCode()}>{he ? 'שיתוף' : 'Share'}</button></div></div>}
        <p role="status">{message}</p><MembersSection onInviteClick={() => void shareCode()} />
      </>}
    </Section>
    <Section title={c.notifications}><p>{he ? 'אפשר לקבל התראות במכשיר הזה. אפשר לשנות זאת גם בהגדרות הדפדפן.' : 'Receive notifications on this device. You can also change this in browser settings.'}</p>{push === 'error' && <p role="alert">{he ? 'לא הצלחנו לבדוק את מצב ההתראות.' : 'Could not check notifications.'}</p>}<button className={button} disabled={push === null || pushBusy || !user} onClick={() => push === 'error' ? loadPush() : void changePush()}>{push === null ? (he ? 'בודקים...' : 'Checking...') : push === 'error' ? (he ? 'נסו שוב' : 'Try again') : push ? (he ? 'כיבוי התראות' : 'Turn off notifications') : (he ? 'הפעלת התראות' : 'Turn on notifications')}</button><p role="status">{pushMessage}</p></Section>
    <Section title={c.agent}><p>{he ? 'אפשר לסמן משימה כהושלמה בתשובה להודעה בוואטסאפ. לדוגמה: ״בוצע 3״ או ״2״.' : 'Mark a task complete by replying to a WhatsApp message, for example “done 2” or “2”.'}</p><p>{he ? 'המספר השמור משמש לזיהוי ההודעות שלכם. להסרתו, בחרו ניתוק.' : 'Your saved number identifies your messages. To remove it, choose Disconnect.'}</p><label htmlFor="whatsapp-phone" className="block font-semibold">{he ? 'מספר טלפון' : 'Phone number'}</label><input id="whatsapp-phone" type="tel" dir="ltr" className={input} value={phone ?? profile?.whatsapp_phone ?? ''} onChange={e => setPhone(e.target.value)} placeholder="0501234567" /><div className="flex flex-wrap gap-2"><button className={button} disabled={phoneSaving || !profile} onClick={() => void savePhone(phone ?? profile?.whatsapp_phone ?? '')}>{he ? 'שמירת מספר' : 'Save number'}</button><button className={button} disabled={phoneSaving || !profile?.whatsapp_phone} onClick={() => void savePhone('')}>{he ? 'ניתוק' : 'Disconnect'}</button></div><p role="status">{phoneMessage}</p></Section>
    <Section title={c.appearance}><p>{he ? 'בחרו את מראה האפליקציה במכשיר הזה.' : 'Choose the appearance on this device.'}</p><div className="flex flex-wrap gap-2">{(['light', 'dark', 'system'] as const).map((value, i) => <button key={value} className={`${button} ${theme === value ? 'bg-bb-primary text-bb-on-primary' : ''}`} aria-pressed={theme === value} onClick={() => changeTheme(value)}>{(he ? ['בהיר', 'כהה', 'לפי המכשיר'] : ['Light', 'Dark', 'System'])[i]}</button>)}</div></Section>
    <Section title={c.plan}><p>{he ? 'פרטי המסלול והאפשרויות הנוכחיים מופיעים כאן. מגבלות המסלול החינמי עדיין עשויות לחול.' : 'Your current plan and options appear below. Free-plan limits may still apply.'}</p><SubscriptionSection /></Section>
    <Section title={c.privacy}><p role="status">{consent === 'loading' ? (he ? 'בודקים את מצב ההסכמה...' : 'Checking consent...') : consent === 'accepted' ? (he ? 'ההסכמה שמורה.' : 'Consent is recorded.') : consent === 'needed' ? (he ? 'נדרשת הסכמה עדכנית.' : 'Current consent is needed.') : (he ? 'לא הצלחנו לבדוק את מצב ההסכמה.' : 'Could not check consent.')}</p>{consent === 'error' && <button className={button} onClick={loadConsent}>{he ? 'נסו שוב' : 'Try again'}</button>}<a className="inline-flex min-h-11 items-center text-bb-primary underline" href="/privacy">{he ? 'מדיניות הפרטיות' : 'Privacy policy'}</a><DeleteAccountSection /></Section>
  </main>;
}
