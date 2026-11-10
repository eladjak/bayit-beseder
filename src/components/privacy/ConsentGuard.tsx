"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { checkConsent } from "@/lib/privacy/client";
import { ConsentGate } from "./ConsentGate";

type State = "checking" | "accepted" | "needed" | "error";

/**
 * Sits between AuthGuard and the app. No app route renders until the server
 * confirms a consent record for the CURRENT policy version.
 *
 * Fails CLOSED: if the check itself fails we show a retry, never the app.
 *
 * Registration with email confirmation cannot write the record (no session
 * yet), so the form leaves a note in the account's metadata. On the first
 * sign-in we turn that note into a real record, but ONLY if it names the
 * current policy version and has all three confirmations.
 */
export function ConsentGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void checkConsent(user).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function retry() {
    if (!user) return;
    setState("checking");
    void checkConsent(user).then(setState);
  }

  if (state === "accepted") return <>{children}</>;

  if (state === "needed") {
    return <ConsentGate source="gate" onAccepted={() => setState("accepted")} />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6" role="status" aria-live="polite">
      <div className="flex max-w-xs flex-col items-center gap-3 text-center">
        {state === "checking" ? (
          <>
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted">{t("privacy.gate.checking")}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-danger">{t("privacy.gate.saveError")}</p>
            <button
              type="button"
              onClick={retry}
              className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("privacy.gate.retry")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
