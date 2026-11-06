"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DAYS, DEFAULT_WEEK, RECIPES, shoppingList, swapMeal } from "@/lib/first-week/plan";
import { comingSunday, weekDates } from "@/lib/meals/week";
import { firstWeekEvent } from "@/lib/first-week/events";

type Draft = { week: number[]; servings: number; pantry: string[]; owner: string; weekStart: string };
const KEY = "bayit-first-week-v1";
const initial: Draft = { week: DEFAULT_WEEK, servings: 2, pantry: [], owner: "אני", weekStart: "" };
const button = "min-h-12 rounded-xl bg-indigo-600 px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
const secondary = "min-h-11 rounded-xl border border-indigo-300 px-3 font-semibold text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

function validDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false;
  const d = value as Draft;
  const date = typeof d.weekStart === "string" ? new Date(`${d.weekStart}T12:00:00Z`) : new Date(NaN);
  const validDate = !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === d.weekStart && date.getUTCDay() === 0;
  return validDate && Array.isArray(d.week) && d.week.length === 7 && d.week.every(id => Number.isInteger(id) && id >= 0 && id < RECIPES.length) && Number.isInteger(d.servings) && d.servings >= 1 && d.servings <= 4 && Array.isArray(d.pantry) && d.pantry.every(x => typeof x === "string") && ["אני", "שותפות"].includes(d.owner);
}

export default function FirstWeekPage() {
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
    if (!seen.current.has(step)) {
      seen.current.add(step);
      const frame = requestAnimationFrame(() => firstWeekEvent(step === 1 ? "ready" : step === 2 ? "shopping" : "complete", draft.owner === "אני" ? "solo" : "shared", Date.now() - startedAt.current));
      return () => cancelAnimationFrame(frame);
    }
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
  return <main dir="rtl" lang="he" className="min-h-dvh bg-[#faf6f0] px-5 py-8 text-[#22213d]"><div className="mx-auto max-w-md space-y-5">
    <Link href="/" className="inline-flex min-h-11 items-center font-bold text-indigo-700">בית בסדר / מתחילים יחד</Link>
    {!ready ? <p role="status">טוענים את השבוע שלך…</p> : !started ? <>
      <img src="/illustrations/category-kitchen.jpg" alt="" className="h-32 w-full rounded-2xl object-cover" />
      <h1 className="text-3xl font-bold leading-tight">פחות לחשוב מה אוכלים.<br />יותר מקום לבית.</h1>
      <p className="leading-7 text-slate-600">נכין שבוע פשוט עם רשימת קניות שאפשר להתאים. אפשר להתחיל גם לבד.</p>
      <div className="rounded-2xl border border-stone-200 bg-white p-5"><strong className="text-indigo-700">השבוע הראשון שלך</strong>{DAYS.slice(0, 3).map((day, i) => <div className="border-b border-stone-100 py-3" key={day}>{day} · {RECIPES[i].name}</div>)}<p className="pt-3 text-sm text-slate-600">אפשר להחליף כל ארוחה ולבדוק מה כבר יש בבית.</p></div>
      <button className={`${button} w-full`} onClick={() => { setStarted(true); save(draft); event("started"); }}>בואו נכין שבוע</button>
      <p className="text-sm text-slate-600">טיוטה מקומית במכשיר הזה, לא שמירה בבית משותף.</p>
    </> : <>
      <p className="text-sm font-bold text-indigo-700">שלב {step} מתוך 3 · {step === 1 ? "ארוחות" : step === 2 ? "קניות" : "שמירה והזמנה"}</p>
      <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">{step === 1 ? "השבוע הראשון שלך" : step === 2 ? "בודקים מה צריך לקנות" : "הבית שלך, בקצב שלך"}</h1>
      {step === 1 && <>
      <p className="leading-7 text-slate-600">שבוע מוצע, מבוסס על מזון מהצומח. הכמויות משוערות; בדקו רכיבים ואלרגנים והתאימו לצרכים שלכם.</p>
      <label className="flex min-h-11 items-center gap-3 font-semibold" htmlFor="servings">מספר סועדים <select id="servings" className="min-h-11 rounded-lg border border-stone-300 bg-white px-3" dir="ltr" value={draft.servings} onChange={e => save({ ...draft, servings: Number(e.target.value) })}>{[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <div className="rounded-2xl border border-stone-200 bg-white p-4">{DAYS.map((day, i) => <div key={day} className="flex items-center justify-between gap-2 border-b border-stone-100 py-2 last:border-0"><div><strong>{day}</strong><div>{RECIPES[draft.week[i]].name}</div></div><button className={secondary} aria-label={`החלפת ארוחה ליום ${day}`} onClick={() => { save({ ...draft, week: swapMeal(draft.week, i) }); event("swap"); }}>החלפה</button></div>)}</div>
      <button className={`${button} w-full`} onClick={() => { setStep(2); }}>המשך לרשימת הקניות</button></>}
      {step === 2 && <>
      <section className="rounded-2xl border border-stone-200 bg-white p-5" aria-labelledby="pantry"><h2 id="pantry" className="text-xl font-bold">מתנת התחלה: בדיקת מזווה</h2><p className="my-2 text-sm text-slate-600">סמנו מה כבר יש בבית. השאר הוא רשימת הקניות שלכם.</p>{items.map(item => <label key={`${item.name}|${item.unit}`} className="flex min-h-11 items-center gap-3 border-b border-stone-100 py-2"><input type="checkbox" className="size-5 accent-indigo-600" checked={draft.pantry.includes(item.name)} onChange={e => { save({ ...draft, pantry: e.target.checked ? [...draft.pantry, item.name] : draft.pantry.filter(x => x !== item.name) }); event("gift"); }} /><span>{item.name} · {item.quantity} {item.unit}</span></label>)}</section>
      <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-xl font-bold">רשימת קניות</h2>{items.filter(item => !draft.pantry.includes(item.name)).length ? <ul className="my-3 list-inside list-disc">{items.filter(item => !draft.pantry.includes(item.name)).map(item => <li key={item.name} className="py-1">{item.name} · {item.quantity} {item.unit}</li>)}</ul> : <p className="my-3">הכול כבר במזווה — אין כרגע מה לקנות.</p>}<label htmlFor="owner" className="font-semibold">אחריות לקניות בטיוטה בלבד </label><select id="owner" className="min-h-11 rounded-lg border border-stone-300 bg-white px-3" value={draft.owner} onChange={e => { save({ ...draft, owner: e.target.value }); event("owner", e.target.value); }}><option>אני</option><option>שותפות</option></select></section>
      <div className="flex gap-3"><button className={secondary} onClick={() => setStep(1)}>חזרה לארוחות</button><button className={`${button} flex-1`} onClick={() => { setStep(3); }}>המשך לשמירה</button></div></>}
      {step === 3 && <>
      <p role="status" className="text-sm text-slate-700">{storage === "saved" ? (remote === "saved" ? "הטיוטה שמורה גם במכשיר הזה." : "הטיוטה שמורה במכשיר הזה בלבד; היא לא נשמרה בבית משותף.") : "לא הצלחנו לשמור במכשיר. הטיוטה זמינה רק כל עוד הדף פתוח."}</p>
      {storage === "error" && <button className={secondary} onClick={() => save(draft)}>ניסיון שמירה חוזר</button>}
      <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-xl font-bold">לשמור את השבוע בבית</h2><p className="my-3 text-sm leading-6">נשמור את הארוחות בימים פנויים בלבד. ימים שכבר מתוכננים לא ישתנו. רשימת הקניות כאן מתייחסת לטיוטה; במסך הארוחות תוכלו לראות מצרכים לפי התוכנית שנשמרה ולאשר הוספה.</p><button className={button} disabled={remote === "saving"} onClick={saveHousehold}>{remote === "saving" ? "שומרים…" : remote === "error" ? "לנסות לשמור שוב" : "שמירת השבוע בבית"}</button><p role="status" className="mt-3 text-sm">{remoteMessage}</p>{remote === "blocked" && <Link className="inline-flex min-h-11 items-center font-bold text-indigo-700 underline" href="/login?next=/first-week">להתחברות</Link>}{remote === "saved" && <Link className="inline-flex min-h-11 items-center font-bold text-indigo-700 underline" href="/meals">לשבוע שנשמר ולהוספת מצרכים</Link>}</section>
      <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-xl font-bold">רוצים להתחיל יחד?</h2><p className="my-3 text-sm leading-6">אפשר להזמין שותף בהגדרות אחרי התחברות. אפשר לשמור את השבוע בבית לפני ההזמנה.</p><Link className={`${secondary} inline-flex items-center`} href="/settings#invite-partner-section" onClick={() => event("invite")}>להתחברות והזמנת שותף</Link><p className="mt-3 text-sm">אפשר להמשיך לבד, בלי להזמין אף אחד.</p></section>
      <button className={secondary} onClick={() => setStep(2)}>חזרה לקניות</button>
      <Link href="/meals" className="inline-flex min-h-11 items-center font-bold text-indigo-700 underline">לתכנון ארוחות בבית המחובר</Link></>}
    </>}
  </div></main>;
}
