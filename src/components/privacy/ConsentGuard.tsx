"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { checkConsent, type ConsentCheck } from "@/lib/privacy/client";
import { ConsentGate } from "./ConsentGate";

/** A consent answer is only ever valid for the user it was obtained for. */
interface Answer {
  userId: string;
  status: ConsentCheck;
}

/**
 * Sits between AuthGuard and the app. No app route renders until the server
 * confirms a consent record for the CURRENT policy version, for THIS user.
 *
 * - The answer is stored together with the user id it belongs to. If the signed-in
 *   user changes (sign out / sign in as someone else, without this component
 *   unmounting), the old answer simply stops matching and the state is "checking"
 *   again in the very same render: user B can never inherit user A's "accepted".
 * - A response that arrives after the user changed, or after a newer check was
 *   started (retry), is discarded.
 * - "Could not check" (outage, timeout) is its own screen with a retry and a way
 *   out. It is never shown as "please consent", and never as "accepted".
 */
export function ConsentGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const userId = user?.id ?? null;
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let stale = false;
    const controller = new AbortController();
    void checkConsent(controller.signal).then((status) => {
      if (!stale) setAnswer({ userId, status });
    });
    return () => {
      stale = true;
      controller.abort();
    };
  }, [userId, attempt]);

  // Derived in render, not in an effect: there is no frame in which a stale answer is visible.
  const status: ConsentCheck | "checking" = answer && answer.userId === userId ? answer.status : "checking";

  function retry() {
    setAnswer(null);
    setAttempt((n) => n + 1);
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace("/login");
    }
  }

  if (status === "accepted") return <>{children}</>;

  if (status === "needed" && userId) {
    return <ConsentGate source="gate" onAccepted={() => setAnswer({ userId, status: "accepted" })} />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6" role="status" aria-live="polite">
      <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
        {status === "checking" ? (
          <>
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted">{t("privacy.gate.checking")}</p>
          </>
        ) : (
          <>
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CloudOff className="size-8" aria-hidden="true" />
            </div>
            <p className="text-base font-semibold text-foreground">{t("privacy.gate.checkError")}</p>
            <p className="text-sm text-muted">{t("privacy.gate.checkErrorHint")}</p>
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={retry}
                className="min-h-12 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-[var(--shadow-warm-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t("privacy.gate.retry")}
              </button>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="min-h-11 rounded-xl text-sm font-medium text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
              >
                {signingOut ? <Loader2 className="mx-auto size-4 animate-spin" aria-hidden="true" /> : t("privacy.gate.signOut")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
