"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DAYS, DEFAULT_WEEK, RECIPES, shoppingList, swapMeal } from "@/lib/first-week/plan";
import { comingSunday, weekDates } from "@/lib/meals/week";
import { firstWeekEvent } from "@/lib/first-week/events";
import { useTranslation } from "@/hooks/useTranslation";
import { publicCopy } from "@/lib/i18n/fragments/public";
import { Illustration } from "@/components/v2/Illustration";

type Props = { title?: string; children?: ReactNode; contact?: boolean; illustration?: boolean; existingDocument?: boolean; embeddedMain?: boolean };

/** Shared, server-rendered frame; existing documents keep their own heading and text. */
export function PublicPage({ title, children, contact = false, illustration = false, existingDocument = false, embeddedMain = false }: Props) {
  const { locale } = useTranslation();
  const copy = publicCopy[locale === "en" ? "en" : "he"];
  const Content = embeddedMain ? "div" : "main";
  return <div dir={locale === "en" ? "ltr" : "rtl"} lang={locale} className="min-h-dvh bg-bb-paper text-bb-ink">
    <a href="#main-content" className="inline-flex min-h-11 items-center px-5 text-bb-ink-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">{copy.skip}</a>
    <Content id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16 focus:outline-none">
      {!existingDocument && <>
        <Link href="/" className="inline-flex min-h-11 items-center text-bb-ink-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">{copy.home}</Link>
        <header className="mb-8 mt-6"><h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1></header>
        {illustration && <div className="mb-10 max-w-sm overflow-hidden rounded-bb-lg"><Illustration id="householdCouple" sizes="(max-width: 640px) 100vw, 384px" decorative /></div>}
      </>}
      <div className={existingDocument ? "space-y-8 text-[17px] leading-relaxed [&_a]:inline-flex [&_a]:min-h-11 [&_a]:min-w-11 [&_a]:items-center" : "space-y-8 text-[17px] leading-relaxed"}>{children}</div>
      <div className="mt-12 border-t border-bb-line pt-8">
        {contact ? <a href="mailto:contact@bayitbeseder.com" dir="ltr" className="inline-flex min-h-12 items-center rounded-bb-md bg-bb-primary px-6 font-bold text-bb-on-primary hover:bg-bb-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2">contact@bayitbeseder.com</a> : <Link href="/login" className="inline-flex min-h-12 items-center rounded-bb-md bg-bb-primary px-6 font-bold text-bb-on-primary hover:bg-bb-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2">{copy.register}</Link>}
      </div>
    </Content>
  </div>;
}

export function PublicInformation({ kind }: { kind: "how" | "about" | "contact" }) {
  const { locale } = useTranslation();
  const c = publicCopy[locale === "en" ? "en" : "he"];
  const title = kind === "how" ? c.howTitle : kind === "about" ? c.aboutTitle : c.contactTitle;
  const sections = kind === "how" ? [[c.howOne, c.howOneBody], [c.howTwo, c.howTwoBody], [c.howThree, c.howThreeBody]] : kind === "about" ? [[c.aboutOne, c.aboutOneBody], [c.aboutTwo, c.aboutTwoBody]] : [[c.contactOne, c.contactBody]];
  return <PublicPage title={title} contact={kind === "contact"} illustration={kind !== "contact"}>{sections.map(([heading, body]) => <section key={heading}><h2 className="text-xl font-bold">{heading}</h2><p>{body}</p></section>)}</PublicPage>;
}

type Draft = { week: number[]; servings: number; pantry: string[]; owner: string; weekStart: string };
const KEY = "bayit-first-week-v1";
const initial: Draft = { week: DEFAULT_WEEK, servings: 2, pantry: [], owner: "אני", weekStart: "" };
const button = "min-h-12 rounded-xl bg-bb-primary px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary";
const secondary = "min-h-11 rounded-xl border border-bb-line-strong px-3 font-semibold text-bb-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary";

function validDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false;
  const d = value as Draft;
  const date = typeof d.weekStart === "string" ? new Date(`${d.weekStart}T12:00:00Z`) : new Date(NaN);
  const validDate = !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === d.weekStart && date.getUTCDay() === 0;
  return validDate && Array.isArray(d.week) && d.week.length === 7 && d.week.every(id => Number.isInteger(id) && id >= 0 && id < RECIPES.length) && Number.isInteger(d.servings) && d.servings >= 1 && d.servings <= 4 && Array.isArray(d.pantry) && d.pantry.every(x => typeof x === "string") && ["אני", "שותפות"].includes(d.owner);
}

export function FirstWeekV2() {
  const startedAt = useRef(0);
  const seen = useRef(new Set<number>());
  const heading = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<Draft>(initial);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [remote, setRemote] = useState<"idle" | "saving" | "saved" | "error" | "blocked">("idle");
  const [remoteMessage, setRemoteMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [storage, setStorage] = useState<"loading" | "saved" | "error">("loading");
  useEffect(() => {
    startedAt.current = Date.now();
    const weekStart = weekDates(comingSunday(new Date()))[0];
    setDraft({ ...initial, weekStart });
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (!validDraft(saved)) throw new Error("invalid draft");
        setDraft(saved);
        setStarted(true);
      }
      setStorage("saved");
    } catch { setStorage("error"); }
    setReady(true);
  }, []);
  function event(name: Parameters<typeof firstWeekEvent>[0], owner = draft.owner) { firstWeekEvent(name, owner === "אני" ? "solo" : "shared", Date.now() - startedAt.current); }
  useEffect(() => {
    if (!started) return;
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start" });
  }, [started, step]);
  useEffect(() => {
    if (!started || seen.current.has(step)) return;
      const frame = requestAnimationFrame(() => {
        if (seen.current.has(step)) return;
        seen.current.add(step);
        firstWeekEvent(step === 1 ? "ready" : step === 2 ? "shopping" : "complete", draft.owner === "אני" ? "solo" : "shared", Date.now() - startedAt.current);
      });
      return () => cancelAnimationFrame(frame);
  }, [started, step, draft.owner]);
  function save(next: Draft) {
    setDraft(next);
    setRemote("idle"); setRemoteMessage("");
    try { localStorage.setItem(KEY, JSON.stringify(next)); setStorage("saved"); }
    catch { setStorage("error"); }
  }
  async function saveHousehold() {
    if (remote === "saving") return;
    if (remote === "error") event("retry");
    setRemote("saving");
    try {
      const response = await fetch("/api/first-week", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week: draft.week, servings: draft.servings, weekStart: draft.weekStart }) });
      if (response.status === 401 || response.status === 403 || response.status === 404) { setRemote("blocked"); event("blocked"); setRemoteMessage("כדי לשמור בבית צריך להתחבר וליצור בית תחילה. הטיוטה נשארת במכשיר."); return; }
      if (!response.ok) throw new Error("save failed");
      const result = await response.json();
      setRemote("saved"); event("saved");
      setRemoteMessage(result.preserved ? `נשמרו ${result.matched} ימים. ${result.preserved} ימים שכבר היו בבית נשארו כפי שהיו.` : "השבוע נשמר בבית שלך.");
    } catch { event("error"); setRemote("error"); setRemoteMessage("לא הצלחנו לשמור בבית. אפשר לנסות שוב; תוכנית קיימת לא תידרס."); }
  }
  const items = shoppingList(draft.week, draft.servings);
  return <main dir="rtl" lang="he" className="min-h-dvh bg-bb-paper px-5 py-8 text-bb-ink"><div className="mx-auto max-w-md space-y-5">
    <Link href="/" className="inline-flex min-h-11 items-center font-bold text-bb-primary">בית בסדר / מתחילים יחד</Link>
    {!ready ? <><h1 className="text-3xl font-bold">השבוע הראשון שלך</h1><p role="status">טוענים את השבוע שלך…</p></> : !started ? <>
      <div className="h-32 overflow-hidden rounded-bb-md"><Illustration id="categoryKitchen" sizes="(max-width: 640px) 100vw, 448px" decorative /></div>
      <h1 className="text-3xl font-bold leading-tight">פחות לחשוב מה אוכלים.<br />יותר מקום לבית.</h1>
      <p className="leading-7 text-bb-ink-2">נכין שבוע פשוט עם רשימת קניות שאפשר להתאים. אפשר להתחיל גם לבד.</p>
      <div className="rounded-2xl border border-bb-line bg-bb-card p-5"><strong className="text-bb-primary">השבוע הראשון שלך</strong>{DAYS.slice(0, 3).map((day, i) => <div className="border-b border-bb-line py-3" key={day}>{day} · {RECIPES[i].name}</div>)}<p className="pt-3 text-sm text-bb-ink-2">אפשר להחליף כל ארוחה ולבדוק מה כבר יש בבית.</p></div>
      <button className={`${button} w-full`} onClick={() => { setStarted(true); save(draft); event("started"); }}>בואו נכין שבוע</button>
      <p className="text-sm text-bb-ink-2">טיוטה מקומית במכשיר הזה, לא שמירה בבית משותף.</p>
    </> : <>
      <p className="text-sm font-bold text-bb-primary">שלב {step} מתוך 3 · {step === 1 ? "ארוחות" : step === 2 ? "קניות" : "שמירה והזמנה"}</p>
      <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">{step === 1 ? "השבוע הראשון שלך" : step === 2 ? "בודקים מה צריך לקנות" : "הבית שלך, בקצב שלך"}</h1>
      {step === 1 && <>
      <p className="leading-7 text-bb-ink-2">שבוע מוצע, מבוסס על מזון מהצומח. הכמויות משוערות; בדקו רכיבים ואלרגנים והתאימו לצרכים שלכם.</p>
      <label className="flex min-h-11 items-center gap-3 font-semibold" htmlFor="servings">מספר סועדים <select id="servings" className="min-h-11 rounded-lg border border-bb-line-strong bg-bb-card px-3" dir="ltr" value={draft.servings} onChange={e => save({ ...draft, servings: Number(e.target.value) })}>{[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <div className="rounded-2xl border border-bb-line bg-bb-card p-4">{DAYS.map((day, i) => <div key={day} className="flex items-center justify-between gap-2 border-b border-bb-line py-2 last:border-0"><div><strong>{day}</strong><div>{RECIPES[draft.week[i]].name}</div></div><button className={secondary} aria-label={`החלפת ארוחה ליום ${day}`} onClick={() => { save({ ...draft, week: swapMeal(draft.week, i) }); event("swap"); }}>החלפה</button></div>)}</div>
      <button className={`${button} w-full`} onClick={() => { setStep(2); }}>המשך לרשימת הקניות</button></>}
      {step === 2 && <>
      <section className="rounded-2xl border border-bb-line bg-bb-card p-5" aria-labelledby="pantry"><h2 id="pantry" className="text-xl font-bold">מתנת התחלה: בדיקת מזווה</h2><p className="my-2 text-sm text-bb-ink-2">סמנו מה כבר יש בבית. השאר הוא רשימת הקניות שלכם.</p>{items.map(item => <label key={`${item.name}|${item.unit}`} className="flex min-h-11 items-center gap-3 border-b border-bb-line py-2"><input type="checkbox" className="size-11 shrink-0 accent-bb-primary" checked={draft.pantry.includes(item.name)} onChange={e => { save({ ...draft, pantry: e.target.checked ? [...draft.pantry, item.name] : draft.pantry.filter(x => x !== item.name) }); event("gift"); }} /><span>{item.name} · {item.quantity} {item.unit}</span></label>)}</section>
      <section className="rounded-2xl border border-bb-line bg-bb-card p-5"><h2 className="text-xl font-bold">רשימת קניות</h2>{items.filter(item => !draft.pantry.includes(item.name)).length ? <ul className="my-3 list-inside list-disc">{items.filter(item => !draft.pantry.includes(item.name)).map(item => <li key={item.name} className="py-1">{item.name} · {item.quantity} {item.unit}</li>)}</ul> : <p className="my-3">הכול כבר במזווה — אין כרגע מה לקנות.</p>}<label htmlFor="owner" className="font-semibold">אחריות לקניות בטיוטה בלבד </label><select id="owner" className="min-h-11 rounded-lg border border-bb-line-strong bg-bb-card px-3" value={draft.owner} onChange={e => { save({ ...draft, owner: e.target.value }); event("owner", e.target.value); }}><option>אני</option><option>שותפות</option></select></section>
      <div className="flex gap-3"><button className={secondary} onClick={() => setStep(1)}>חזרה לארוחות</button><button className={`${button} flex-1`} onClick={() => { setStep(3); }}>המשך לשמירה</button></div></>}
      {step === 3 && <>
      <p role="status" className="text-sm text-bb-ink-2">{storage === "saved" ? (remote === "saved" ? "הטיוטה שמורה גם במכשיר הזה." : "הטיוטה שמורה במכשיר הזה בלבד; היא לא נשמרה בבית משותף.") : "לא הצלחנו לשמור במכשיר. הטיוטה זמינה רק כל עוד הדף פתוח."}</p>
      {storage === "error" && <button className={secondary} onClick={() => save(draft)}>ניסיון שמירה חוזר</button>}
      <section className="rounded-2xl border border-bb-line bg-bb-card p-5"><h2 className="text-xl font-bold">לשמור את השבוע בבית</h2><p className="my-3 text-sm leading-6">נשמור את הארוחות בימים פנויים בלבד. ימים שכבר מתוכננים לא ישתנו. רשימת הקניות כאן מתייחסת לטיוטה; במסך הארוחות תוכלו לראות מצרכים לפי התוכנית שנשמרה ולאשר הוספה.</p><button className={button} disabled={remote === "saving"} onClick={saveHousehold}>{remote === "saving" ? "שומרים…" : remote === "error" ? "לנסות לשמור שוב" : "שמירת השבוע בבית"}</button><p role="status" className="mt-3 text-sm">{remoteMessage}</p>{remote === "blocked" && <Link className="inline-flex min-h-11 items-center font-bold text-bb-primary underline" href="/login?next=/first-week">להתחברות</Link>}{remote === "saved" && <Link className="inline-flex min-h-11 items-center font-bold text-bb-primary underline" href="/meals">לשבוע שנשמר ולהוספת מצרכים</Link>}</section>
      <section className="rounded-2xl border border-bb-line bg-bb-card p-5"><h2 className="text-xl font-bold">רוצים להתחיל יחד?</h2><p className="my-3 text-sm leading-6">אפשר להזמין שותף בהגדרות אחרי התחברות. אפשר לשמור את השבוע בבית לפני ההזמנה.</p><Link className={`${secondary} inline-flex items-center`} href="/settings#invite-partner-section" onClick={() => event("invite")}>להתחברות והזמנת שותף</Link><p className="mt-3 text-sm">אפשר להמשיך לבד, בלי להזמין אף אחד.</p></section>
      <button className={secondary} onClick={() => setStep(2)}>חזרה לקניות</button>
      <Link href="/meals" className="inline-flex min-h-11 items-center font-bold text-bb-primary underline">לתכנון ארוחות בבית המחובר</Link></>}
    </>}
  </div></main>;
}
