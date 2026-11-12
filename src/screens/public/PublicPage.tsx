"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { publicCopy } from "@/lib/i18n/fragments/public";
import { Illustration } from "@/components/v2/Illustration";

type Props = { title?: string; children?: ReactNode; contact?: boolean; illustration?: boolean; existingDocument?: boolean };

/** Shared, server-rendered frame; existing documents keep their own heading and text. */
export function PublicPage({ title, children, contact = false, illustration = false, existingDocument = false }: Props) {
  const { locale } = useTranslation();
  const copy = publicCopy[locale === "en" ? "en" : "he"];
  return <div dir={locale === "en" ? "ltr" : "rtl"} lang={locale} className="min-h-dvh bg-bb-paper text-bb-ink">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:start-2 focus:rounded-bb-md focus:bg-bb-card focus:p-4 focus:text-bb-ink">{copy.skip}</a>
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16 focus:outline-none">
      {!existingDocument && <>
        <Link href="/" className="inline-flex min-h-11 items-center text-bb-ink-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">{copy.home}</Link>
        <header className="mb-8 mt-6"><h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1></header>
        {illustration && <div className="mb-10 max-w-sm overflow-hidden rounded-bb-lg"><Illustration id="householdCouple" sizes="(max-width: 640px) 100vw, 384px" decorative /></div>}
      </>}
      <div className="space-y-8 text-[17px] leading-relaxed">{children}</div>
      <div className="mt-12 border-t border-bb-line pt-8">
        {contact ? <a href="mailto:contact@bayitbeseder.com" dir="ltr" className="inline-flex min-h-12 items-center rounded-bb-md bg-bb-primary px-6 font-bold text-bb-on-primary hover:bg-bb-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2">contact@bayitbeseder.com</a> : <Link href="/login" className="inline-flex min-h-12 items-center rounded-bb-md bg-bb-primary px-6 font-bold text-bb-on-primary hover:bg-bb-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2">{copy.register}</Link>}
      </div>
    </main>
  </div>;
}

export function PublicInformation({ kind }: { kind: "how" | "about" | "contact" }) {
  const { locale } = useTranslation();
  const c = publicCopy[locale === "en" ? "en" : "he"];
  const title = kind === "how" ? c.howTitle : kind === "about" ? c.aboutTitle : c.contactTitle;
  const sections = kind === "how" ? [[c.howOne, c.howOneBody], [c.howTwo, c.howTwoBody], [c.howThree, c.howThreeBody]] : kind === "about" ? [[c.aboutOne, c.aboutOneBody], [c.aboutTwo, c.aboutTwoBody]] : [[c.contactOne, c.contactBody]];
  return <PublicPage title={title} contact={kind === "contact"} illustration={kind !== "contact"}>{sections.map(([heading, body]) => <section key={heading}><h2 className="text-xl font-bold">{heading}</h2><p>{body}</p></section>)}</PublicPage>;
}
