"use client";

import Link from "next/link";
import { Fragment } from "react";
import { Languages } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  CONTACT_EMAIL,
  POLICY_DATE,
  POLICY_VERSION,
  PRIVACY_EMAIL,
} from "@/lib/privacy/policy";
import {
  PRIVACY_PAGE,
  PRIVACY_SECTIONS,
  PROCESSORS,
  TERMS_PAGE,
  TERMS_SECTIONS,
  splitTokens,
  type Block,
  type L,
} from "@/lib/privacy/content";

/** Text with {privacyEmail} / {contactEmail} turned into mailto links (always left-to-right). */
function Rich({ text }: { text: string }) {
  return (
    <>
      {splitTokens(text).map((part, i) => {
        if (part.type === "text") return <Fragment key={i}>{part.value}</Fragment>;
        const email = part.type === "privacyEmail" ? PRIVACY_EMAIL : CONTACT_EMAIL;
        return (
          <a
            key={i}
            href={`mailto:${email}`}
            dir="ltr"
            className="font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm"
          >
            {email}
          </a>
        );
      })}
    </>
  );
}

function Blocks({ blocks, lang }: { blocks: Block[]; lang: "he" | "en" }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ("p" in b) {
          return (
            <p key={i}>
              <Rich text={b.p[lang]} />
            </p>
          );
        }
        if ("list" in b) {
          return (
            <ul key={i} className="space-y-2.5">
              {b.list.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span>{item[lang]}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <dl key={i} className="space-y-3">
            {b.facts.map((f, j) => (
              <div key={j} className="rounded-xl border border-border bg-surface px-4 py-3">
                <dt className="mb-0.5 text-sm font-bold text-foreground">{f.label[lang]}</dt>
                <dd className="text-sm leading-relaxed">{f.text[lang]}</dd>
              </div>
            ))}
          </dl>
        );
      })}
    </>
  );
}

function ProcessorList({ lang }: { lang: "he" | "en" }) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-3" aria-label={t("privacy.policy.processorsTitle")}>
      {PROCESSORS.map((p) => (
        <li key={p.name} className="rounded-xl border border-border bg-surface px-4 py-3.5">
          <p className="mb-1.5 text-sm font-bold text-foreground">{p.name}</p>
          <p className="text-sm leading-relaxed">
            <span className="font-semibold text-foreground">{t("privacy.policy.receives")}: </span>
            {p.gets[lang]}
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            <span className="font-semibold text-foreground">{t("privacy.policy.purpose")}: </span>
            {p.why[lang]}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** The privacy policy or the terms, in the visitor's language, from one data source. */
export function PolicyDocument({ kind }: { kind: "privacy" | "terms" }) {
  const { t, locale, setLocale } = useTranslation();
  const lang: "he" | "en" = locale === "en" ? "en" : "he";
  const page = kind === "privacy" ? PRIVACY_PAGE : TERMS_PAGE;
  const sections = kind === "privacy" ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const other = kind === "privacy" ? "/terms" : "/privacy";
  const otherLabel = kind === "privacy" ? TERMS_PAGE.title : PRIVACY_PAGE.title;
  const intro = (page as { intro: L }).intro;
  const footer = (TERMS_PAGE as { footer?: L }).footer;

  return (
    <div className="min-h-dvh bg-background" dir={lang === "he" ? "rtl" : "ltr"} lang={lang}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg text-sm text-muted transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("privacy.policy.back")}
          </Link>
          <button
            type="button"
            onClick={() => setLocale(lang === "he" ? "en" : "he")}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Languages className="size-4" aria-hidden="true" />
            {t("privacy.policy.switchTo")}
          </button>
        </div>

        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">{page.title[lang]}</h1>
          <p className="text-sm text-muted">
            {t("privacy.policy.updated").replace("{date}", POLICY_DATE[lang])} ·{" "}
            {t("privacy.policy.version").replace("{version}", "")}
            <bdi dir="ltr">{POLICY_VERSION}</bdi>
          </p>
          <p className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-base leading-relaxed text-foreground">
            {intro[lang]}
          </p>
        </header>

        <div className="space-y-9 text-muted">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-6">
              <h2 id={`${s.id}-h`} className="mb-3 text-xl font-semibold text-foreground">
                {s.title[lang]}
              </h2>
              <div className="space-y-3 leading-relaxed">
                {s.id === "processors" && kind === "privacy" ? (
                  <>
                    <Blocks blocks={s.blocks.slice(0, 1)} lang={lang} />
                    <ProcessorList lang={lang} />
                    <Blocks blocks={s.blocks.slice(1)} lang={lang} />
                  </>
                ) : (
                  <Blocks blocks={s.blocks} lang={lang} />
                )}
              </div>
            </section>
          ))}
        </div>

        {footer && kind === "terms" && (
          <p className="mt-10 border-t border-border pt-5 text-sm text-muted">{footer[lang]}</p>
        )}

        <nav
          aria-label={t("privacy.policy.otherDoc")}
          className="mt-10 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-6 text-sm"
        >
          <Link href="/" className="inline-flex min-h-11 items-center text-muted hover:text-foreground">
            {t("privacy.policy.home")}
          </Link>
          <Link href={other} className="inline-flex min-h-11 items-center text-muted hover:text-foreground">
            {otherLabel[lang]}
          </Link>
          <Link href="/login" className="inline-flex min-h-11 items-center text-muted hover:text-foreground">
            {t("privacy.policy.login")}
          </Link>
        </nav>
        {kind === "privacy" && <p className="mt-2 text-xs text-muted">{t("privacy.policy.deleteHint")}</p>}
      </div>
    </div>
  );
}
