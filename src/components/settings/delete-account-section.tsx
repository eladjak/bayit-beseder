"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useTranslation } from "@/hooks/useTranslation";

type Phase = "idle" | "deleting";

/**
 * "Delete my account" for the settings danger zone.
 * One deliberate step: a dialog that says what will happen, then asks the
 * person to type their own email address. The server checks it again and only
 * ever deletes the signed-in user.
 */
export function DeleteAccountSection({ onGate = false }: { onGate?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const inputId = useId();
  const errId = useId();

  const email = user?.email ?? "";
  const matches = email !== "" && typed.trim().toLowerCase() === email.toLowerCase();
  const deleting = phase === "deleting";

  function close() {
    if (deleting) return;
    setOpen(false);
    setTyped("");
    setError(null);
    openerRef.current?.focus();
  }

  const trapRef = useFocusTrap<HTMLDivElement>(open, close);

  // Put the cursor in the field so the keyboard opens straight away on phones.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!matches) {
      setError(t("privacy.delete.errMismatch"));
      inputRef.current?.focus();
      return;
    }
    setPhase("deleting");
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: typed.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; authUserDeleted?: boolean };
      if (res.ok) {
        await createClient().auth.signOut().catch(() => undefined);
        try {
          localStorage.clear();
        } catch {
          // Storage can be blocked; the account is gone either way.
        }
        toast.success(t("privacy.delete.done"), {
          description: data.authUserDeleted === false ? t("privacy.delete.keptNote") : undefined,
          duration: 8000,
        });
        router.replace("/");
        return;
      }
      setError(
        data.error === "active_subscription"
          ? t("privacy.delete.errSubscription")
          : data.error === "delete_unavailable"
            ? t("privacy.delete.errUnavailable")
            : data.error === "confirmation_mismatch"
              ? t("privacy.delete.errMismatch")
              : res.status === 429
                ? t("privacy.delete.errTooMany")
                : t("privacy.delete.errGeneric"),
      );
    } catch {
      setError(t("privacy.delete.errGeneric"));
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="border-t border-border pt-4">
      <h2 className="mb-2 text-sm font-semibold">{t("privacy.delete.title")}</h2>
      <p className="mb-3 text-xs text-muted">{t(onGate ? "privacy.delete.descGate" : "privacy.delete.desc")}</p>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-danger/40 text-sm font-medium text-danger transition-all duration-150 hover:bg-danger/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {t("privacy.delete.open")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-surface p-5 shadow-[var(--shadow-warm-lg)]"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger">
                <ShieldAlert className="size-5" aria-hidden="true" />
              </span>
              <h2 id={titleId} className="text-lg font-bold text-foreground">
                {t("privacy.delete.dialogTitle")}
              </h2>
            </div>

            <p className="mb-2 text-sm text-muted">{t("privacy.delete.intro")}</p>
            <ul className="mb-3 space-y-2 text-sm text-foreground">
              {(["i1", "i2", "i3", "i4"] as const).map((k) => (
                <li key={k} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-danger/70" />
                  <span>{t(`privacy.delete.${k}`)}</span>
                </li>
              ))}
            </ul>
            <p className="mb-4 text-sm font-bold text-danger">{t("privacy.delete.cannotUndo")}</p>

            <form onSubmit={handleDelete} noValidate>
              <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
                {t("privacy.delete.typeLabel")}
              </label>
              <input
                id={inputId}
                ref={inputRef}
                type="email"
                inputMode="email"
                dir="ltr"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setError(null);
                }}
                disabled={deleting}
                placeholder={email || t("privacy.delete.typeExample")}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errId : undefined}
                className={`min-h-11 w-full rounded-xl border bg-background px-3.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  error ? "border-danger" : "border-border focus:border-primary"
                }`}
              />
              <p className="mt-1 text-xs text-muted">{t("privacy.delete.typeExample")}</p>
              {error && (
                <p id={errId} role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-danger">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={deleting}
                  className="min-h-11 rounded-xl border border-border px-5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  {t("privacy.delete.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!matches || deleting}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 text-sm font-bold text-white transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-40"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      {t("privacy.delete.deleting")}
                    </>
                  ) : (
                    t("privacy.delete.confirm")
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
