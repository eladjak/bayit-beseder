'use client';
/* The JSX samples are tuple values, not sibling array children. */
/* eslint-disable react/jsx-key */

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button, IconButton, Card, Field, QuickAdd, Check, HelpTip, EmptyState, Notice, Skeleton, StepIndicator, AvatarChip, RoomMark, CountUp, Sheet, Dialog, showToast, Illustration } from '@/components/v2';
import { galleryCopy, isGalleryAllowed } from '@/lib/i18n/fragments/gallery';

const subscribe = () => () => {};

function Examples({ language }: { language: 'he' | 'en' }) {
  const c = galleryCopy[language];
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [checked, setChecked] = useState(false);
  const sections: [string, ReactNode][] = [
    ['Button', <div className="flex flex-wrap gap-2">{(['primary', 'quiet', 'danger', 'link'] as const).map(variant => <Button key={variant} variant={variant}>{variant}</Button>)}<Button>{c.long}</Button><Button size="lg">Large</Button><Button disabled>Disabled</Button><Button loading>Loading</Button><Button className="outline-2 outline-offset-2 outline-bb-primary">Focus</Button><Button className="scale-[.97]">Pressed</Button></div>],
    ['IconButton', <div className="flex gap-2"><IconButton label={c.action}><Plus aria-hidden="true" className="size-5" /></IconButton><IconButton label={`${c.action} 36`} size={36}><Plus aria-hidden="true" className="size-5" /></IconButton><IconButton label="Disabled" disabled><Plus aria-hidden="true" className="size-5" /></IconButton></div>],
    ['Card', <div className="space-y-2"><Card>{c.long}</Card><Card room={c.field} onClick={() => setDialog(true)}>{c.action}</Card></div>],
    ['Field', <div className="space-y-3"><Field label={c.field} hint={c.hint} /><Field label={c.field} error={c.error} /><Field label={c.field} multiline maxLength={120} /><Field label={c.field} disabled /></div>],
    ['QuickAdd', <div className="space-y-4"><QuickAdd label={c.field} placeholder={c.hint} submitLabel={c.action} errorMessage={c.error} savedMessage={c.saved} onSubmit={async () => ({ ok: true })} /><div><p>{language === 'he' ? 'דוגמת שגיאה: הקלידו ושלחו כדי לראות את ההודעה' : 'Error example: enter text and submit to see the message'}</p><QuickAdd label={language === 'he' ? 'דוגמת הוספה שנכשלת' : 'Failing quick add example'} placeholder={c.hint} submitLabel={c.action} errorMessage={c.error} savedMessage={c.saved} onSubmit={async () => ({ ok: false, message: c.error })} /></div></div>],
    ['Check', <div className="flex flex-wrap"><Check label={c.field} checked={checked} pending={false} onToggle={() => setChecked(!checked)} /><Check label={c.field} checked pending={false} onToggle={() => {}} /><Check label={c.field} checked={false} pending onToggle={() => {}} /><Check label={c.field} checked={false} pending={false} failed onToggle={() => {}} /></div>],
    ['HelpTip', <HelpTip topic={c.field}>{c.hint}</HelpTip>],
    ['EmptyState', <div className="space-y-4"><EmptyState headingLevel={3} illustration={<span aria-hidden="true">✓</span>} title={c.empty} hint={c.hint} action={<Button>{c.action}</Button>} /><EmptyState headingLevel={3} illustration={<span aria-hidden="true">✓</span>} title={c.empty} /></div>],
    ['Notice', <div className="space-y-2">{(['info', 'warning', 'error', 'success'] as const).map(tone => <Notice key={tone} tone={tone}>{c.long}</Notice>)}</div>],
    ['Skeleton', <div className="space-y-3">{(['lines', 'card', 'row'] as const).map(variant => <Skeleton key={variant} variant={variant} label={c.loading} />)}</div>],
    ['StepIndicator', <StepIndicator current={2} total={3} label="2 / 3" />],
    ['AvatarChip', <div className="flex flex-wrap gap-4"><AvatarChip id="1" name={c.field} /><AvatarChip id="2" name={c.field} size="sm" shared sharedLabel={c.field} /></div>],
    ['RoomMark', <div className="flex flex-wrap gap-4">{(['kitchen', 'bathroom', 'living', 'bedroom', 'laundry', 'outdoor', 'pets', 'general'] as const).map(room => <RoomMark key={room} room={room} name={room} />)}</div>],
    ['CountUp', <CountUp value={42} />],
    ['Sheet', <><Button onClick={() => setSheet(true)}>{c.openSheet}</Button><Sheet open={sheet} title={c.openSheet} onClose={() => setSheet(false)}><p>{c.hint}</p></Sheet></>],
    ['Dialog', <><Button onClick={() => setDialog(true)}>{c.openDialog}</Button><Dialog open={dialog} title={c.openDialog} onClose={() => setDialog(false)}><p>{c.hint}</p></Dialog></>],
    ['showToast', <Button onClick={() => showToast({ message: c.saved, tone: 'success', undo: async () => true })}>{c.toast}</Button>],
    ['Illustration', <Illustration id="emptyTasks" sizes="(max-width: 600px) 240px, 320px" />],
  ];
  return <div lang={language} dir={language === 'he' ? 'rtl' : 'ltr'} className="min-w-0 space-y-8"><h2 className="text-2xl font-bold">{language === 'he' ? 'עברית' : 'English'}</h2>{sections.map(([name, sample]) => <section key={name} className="space-y-3 border-t border-bb-line pt-5"><h3 className="text-xl font-bold" dir="ltr">{name}</h3>{sample}</section>)}</div>;
}
export default function GalleryPage() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-ui');
    root.setAttribute('data-ui', 'v2');
    return () => { if (previous === null) root.removeAttribute('data-ui'); else root.setAttribute('data-ui', previous); };
  }, []);
  if (!isGalleryAllowed(process.env.NEXT_PUBLIC_VERCEL_ENV)) notFound();
  return <main data-ui="v2" className="min-h-screen bg-bb-paper px-4 py-8 text-bb-ink"><meta name="robots" content="noindex, nofollow" /><div className="mx-auto max-w-6xl space-y-8"><header dir="rtl" lang="he"><h1 className="text-3xl font-bold">{galleryCopy.he.title}</h1><p className="mt-2">{galleryCopy.he.intro}</p></header><div className="grid gap-12 md:grid-cols-2">{mounted && <><Examples language="he" /><Examples language="en" /></>}</div></div></main>;
}
