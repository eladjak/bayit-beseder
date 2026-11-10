"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import {
  ClipboardList,
  ExternalLink,
  Home,
  Loader2,
  AlertCircle,
  LogOut,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageToggle } from "@/components/language-toggle";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { SubscriptionSection } from "@/components/settings/subscription-section";
import { GATE_CARDS } from "@/lib/privacy/content";
import { POLICY_VERSION, type ConsentSource } from "@/lib/privacy/policy";
import {
  ConsentChecks,
  type ConsentChecksHandle,
  type ConsentErrors,
  type ConsentValues,
} from "./ConsentChecks";

const ICONS = {
  collect: ClipboardList,
  why: Sparkles,
  who: Share2,
  rights: ShieldCheck,
} as const;

interface Props {
  /** Called after the consent was saved on the server. */
  onAccepted: () => void;
  source?: ConsentSource;
  /** Heading override (e.g. when someone is about to join a household). */
  title?: string;
}

/**
 * The privacy gate: a plain-language summary and three required boxes.
 * Nothing in the app renders until the server has stored the consent
 * for the CURRENT policy version.
 */
export function ConsentGate({ onAccepted, source = "gate", title }: Props) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const checksRef = useRef<ConsentChecksHandle>(null);
  const [values, setValues] = useState<ConsentValues>({ age: false, privacy: false, terms: false });
  const [errors, setErrors] = useState<ConsentErrors>({});
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    const next: ConsentErrors = {};
    if (!values.age) next.age = t("privacy.gate.errAge");
    if (!values.privacy) next.privacy = t("privacy.gate.errPrivacy");
    if (!values.terms) next.terms = t("privacy.gate.errTerms");
    setErrors(next);
    setSaveError(null);
    if (next.age || next.privacy || next.terms) {
      checksRef.current?.focusFirstInvalid(next);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/privacy/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageConfirmed: true,
          privacyAccepted: true,
          termsAccepted: true,
          locale,
          source,
        }),
      });
      if (res.ok) {
        onAccepted();
        return;
      }
      setSaveError(res.status === 429 ? t("privacy.gate.tooMany") : t("privacy.gate.saveError"));
    } catch {
      setSaveError(t("privacy.gate.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace("/login");
    }
  }

  if (declined) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-dvh flex-col items-center bg-background px-4 pb-10 pt-4" dir={locale === "he" ? "rtl" : "ltr"}>
          <div className="flex w-full max-w-lg justify-end">
            <LanguageToggle />
          </div>
          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-lg"
            aria-labelledby="declined-title"
          >
            <header className="mb-6 mt-2 flex flex-col items-center gap-3 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary shadow-[var(--shadow-warm-md)]">
                <Home className="size-8 text-white" aria-hidden="true" />
              </div>
              <h1 id="declined-title" className="text-2xl font-bold text-foreground">
                {t("privacy.gate.declinedTitle")}
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-muted">{t("privacy.gate.declinedBody")}</p>
            </header>

            <button
              type="button"
              onClick={() => setDeclined(false)}
              className="mb-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-white shadow-[var(--shadow-warm-md)] transition-transform duration-150 hover:bg-primary-dark active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {t("privacy.gate.declinedBack")}
            </button>

            <section aria-labelledby="declined-more" className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-warm-sm)]">
              <h2 id="declined-more" className="text-sm font-bold text-foreground">
                {t("privacy.gate.declinedMore")}
              </h2>
              <SubscriptionSection cancelOnly />
              <DeleteAccountSection onGate />
              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-foreground transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  {signingOut ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
                  {t("privacy.gate.signOut")}
                </button>
              </div>
            </section>
          </motion.main>
        </div>
      </MotionConfig>
    );
  }

  const busy = saving || signingOut;
  const linkClass =
    "inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="flex min-h-dvh flex-col items-center bg-background px-4 pb-10 pt-4"
        dir={locale === "he" ? "rtl" : "ltr"}
      >
        <div className="flex w-full max-w-lg justify-end">
          <LanguageToggle />
        </div>

        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-lg"
          aria-labelledby="gate-title"
        >
          <header className="mb-6 mt-2 flex flex-col items-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary shadow-[var(--shadow-warm-md)]">
              <Home className="size-8 text-white" aria-hidden="true" />
            </div>
            <h1 id="gate-title" className="text-2xl font-bold text-foreground">
              {title ?? t("privacy.gate.title")}
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-muted">{t("privacy.gate.subtitle")}</p>
          </header>

          <section aria-label={t("privacy.gate.cardsLabel")} className="mb-6">
            <ul className="grid gap-3 sm:grid-cols-2">
              {GATE_CARDS.map((card, i) => {
                const Icon = ICONS[card.icon];
                return (
                  <motion.li
                    key={card.icon}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 + i * 0.04, ease: "easeOut" }}
                    className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-warm-sm)]"
                  >
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-[18px]" aria-hidden="true" />
                      </span>
                      <h2 className="text-sm font-bold text-foreground">{card.title[locale]}</h2>
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted">{card.text[locale]}</p>
                  </motion.li>
                );
              })}
            </ul>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2">
              <Link href="/privacy" target="_blank" rel="noopener" className={linkClass}>
                {t("privacy.gate.fullPolicy")}
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("privacy.gate.opensNewTab")}</span>
              </Link>
              <Link href="/terms" target="_blank" rel="noopener" className={linkClass}>
                {t("privacy.gate.fullTerms")}
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("privacy.gate.opensNewTab")}</span>
              </Link>
            </div>
          </section>

          <form onSubmit={handleAccept} noValidate className="space-y-4">
            <fieldset disabled={busy} className="space-y-2.5">
              <legend className="mb-2 text-sm font-semibold text-foreground">{t("privacy.gate.checksLegend")}</legend>
              <ConsentChecks
                ref={checksRef}
                idPrefix="gate"
                values={values}
                errors={errors}
                onChange={(v) => {
                  setValues(v);
                  setErrors({});
                }}
              />
            </fieldset>

            {saveError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/5 px-3.5 py-3 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{saveError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-white shadow-[var(--shadow-warm-md)] transition-transform duration-150 hover:bg-primary-dark active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("privacy.gate.saving")}
                </>
              ) : (
                t("privacy.gate.accept")
              )}
            </button>

            <button
              type="button"
              onClick={() => setDeclined(true)}
              disabled={busy}
              className="flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-muted transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              {t("privacy.gate.notNow")}
            </button>
          </form>

          <div className="mt-5 space-y-1 text-center text-xs text-muted">
            <p className="flex items-center justify-center gap-1.5">
              <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
              {t("privacy.gate.youCanDelete")}
            </p>
            <p>
              {t("privacy.gate.version").replace("{version}", "")}
              <bdi dir="ltr">{POLICY_VERSION}</bdi>
            </p>
          </div>
        </motion.main>
      </div>
    </MotionConfig>
  );
}
