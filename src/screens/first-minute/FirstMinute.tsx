"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import firstMinute from "@/lib/i18n/fragments/first-minute";
import { loadHousehold, saveHousehold } from "@/lib/household-type";
import { useTranslation } from "@/hooks/useTranslation";
import { isQuietTime, useFirstMinute } from "./useFirstMinute";

const households = ["solo", "couple", "family", "roommates"] as const;
const focuses = ["kitchen", "laundry", "tidying", "cleaning", "shopping", "together"] as const;
const button = "min-h-12 rounded-bb-md bg-bb-primary px-6 font-semibold text-bb-on-primary hover:bg-bb-primary-hover active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary disabled:opacity-50";
export function FirstMinute() {
  const { locale } = useTranslation(); const en = locale === "en"; const copy = firstMinute[en ? "en" : "he"];
  const flow = useFirstMinute();
  const router = useRouter();
  const [closed, setClosed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("#first-minute-heading")?.focus();
  }, [flow.step, flow.profile]);
  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]") ?? []);
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement?.id === "first-minute-heading")) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  const [alreadyDone] = useState(() => typeof window !== "undefined" && !!localStorage.getItem("bayit-beseder-onboarding-done"));
  if ((alreadyDone && flow.step !== "invite") || !flow.profile || closed) return null;
  if (flow.step === "invite") return <section dir={en ? "ltr" : "rtl"} className="m-5 rounded-bb-md bg-bb-card p-5 text-bb-ink shadow-sm"><h2 className="text-xl font-bold">{copy.inviteTitle}</h2><p className="my-3">{copy.inviteDescription}</p><Link href="/settings" className="inline-flex min-h-11 items-center font-bold text-bb-primary">{copy.inviteLink}</Link><button className="ms-4 min-h-11 min-w-11 underline" onClick={() => { localStorage.removeItem("bayit-first-minute-invite"); setClosed(true); }}>{copy.later}</button></section>;
  return createPortal(<div ref={dialogRef} onKeyDown={trapFocus} className="fixed inset-0 z-[10000] overflow-y-auto bg-bb-paper p-5 text-bb-ink" dir={en ? "ltr" : "rtl"} role="dialog" aria-modal="true" aria-labelledby="first-minute-heading"><div className="mx-auto max-w-2xl py-6">
    {flow.step === "household" && <><p className="text-bb-ink-2">{copy.stepOne}</p><h1 tabIndex={-1} id="first-minute-heading" className="mt-2 text-3xl font-bold">{copy.householdTitle}</h1><p className="my-4">{copy.householdHint}</p><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{households.map((key) => <button key={key} onClick={() => { localStorage.setItem("bayit-first-minute-household", key); saveHousehold({ ...loadHousehold(), type: key }); flow.setStep("focus"); }} className="overflow-hidden rounded-bb-md bg-bb-card text-start font-bold shadow-sm focus-visible:outline-2 focus-visible:outline-bb-primary"><img src={`/illustrations/household-${key}.jpg`} alt="" className="aspect-square w-full object-cover" /><span className="flex min-h-12 items-center px-4">{copy[key]}</span></button>)}</div></>}
    {flow.step === "focus" && <><p className="text-bb-ink-2">{copy.stepTwo}</p><h1 tabIndex={-1} id="first-minute-heading" className="mt-2 text-3xl font-bold">{copy.focusTitle}</h1><p className="my-4">{copy.focusHint}</p><div className="flex flex-wrap gap-3">{focuses.map((key) => <button key={key} aria-pressed={flow.focus.includes(firstMinute.he[key])} onClick={() => flow.setFocus(flow.focus.includes(firstMinute.he[key]) ? flow.focus.filter(x => x !== firstMinute.he[key]) : [...flow.focus, firstMinute.he[key]])} className="min-h-12 rounded-full border border-bb-line-strong bg-bb-card px-5 aria-pressed:bg-bb-primary aria-pressed:text-bb-on-primary focus-visible:outline-2 focus-visible:outline-bb-primary">{copy[key]}</button>)}</div><button className={`${button} mt-8`} disabled={flow.busy} onClick={() => void flow.prepare()}>{flow.busy ? (copy.preparing) : (flow.error ? (copy.retry) : (copy.prepare))}</button>{flow.error && <p role="alert" className="mt-4 text-bb-danger-ink">{copy.prepareError}</p>}</>}
    {flow.step === "ready" && <><p className="mb-2 text-bb-ink-2">{copy.stepThree}</p><h1 tabIndex={-1} id="first-minute-heading" className="text-3xl font-bold">{copy.readyTitle}</h1><p className="my-5">{copy.readyDescription}</p><button className={button} onClick={() => flow.setStep("win")}>{copy.showMe}</button></>}
    {flow.step === "win" && <><p className="mb-2 text-bb-ink-2">{copy.stepFour}</p><h1 tabIndex={-1} id="first-minute-heading" className="text-3xl font-bold">{copy.winTitle}</h1><p className="my-5 text-xl">{copy.openWindow}</p><p className="mb-5">{copy.winHint}</p><button className={button} disabled={flow.busy} onClick={() => void flow.complete()}>{flow.busy ? (copy.saving) : (copy.done)}</button>{flow.error && <p role="alert" className="mt-4 text-bb-danger-ink">{copy.completionError}</p>}</>}
    {flow.step === "celebrate" && <><h1 tabIndex={-1} id="first-minute-heading" className="text-3xl font-bold">{copy.celebrateTitle}</h1>{!isQuietTime() && <img src="/illustrations/welcome-home.jpg" alt="" className="my-5 w-full max-w-sm rounded-bb-md" />}<p className="mb-5">{copy.celebrateDescription}</p><button className={button} onClick={() => { flow.setStep("invite"); router.refresh(); }}>{copy.continueToday}</button></>}
  </div></div>, document.body);
}
