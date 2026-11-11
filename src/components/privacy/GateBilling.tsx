"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * The "cancel my subscription" option on the privacy gate.
 *
 * Someone who has not accepted the policy may not read this app's tables from the browser (not even
 * their own subscription rows: migration 028). So this does NOT query the database. It asks the
 * server (an allow-listed route that works without consent) one yes/no question, and cancelling goes
 * through the same route. Nothing but a boolean ever reaches the browser.
 */
export function GateBilling() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "none" | "billing" | "error">("loading");
  const [canceling, setCanceling] = useState(false);

  const check = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/sumit/cancel-subscription", { cache: "no-store" });
      if (!res.ok) return setState("error");
      const body = (await res.json()) as { cancellable?: unknown };
      setState(body.cancellable === true ? "billing" : "none");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  async function cancel() {
    if (!confirm(t("settings.subscriptionSection.cancelConfirm"))) return;
    setCanceling(true);
    try {
      const res = await fetch("/api/sumit/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        toast.error(t("settings.subscriptionSection.cancelError"));
        return;
      }
      toast.success(t("settings.subscriptionSection.cancelSuccess"));
      void check();
    } catch {
      toast.error(t("settings.subscriptionSection.cancelError"));
    } finally {
      setCanceling(false);
    }
  }

  if (state === "loading") return <div className="h-4" aria-hidden="true" />;
  if (state === "error") {
    return (
      <div className="space-y-2" role="status">
        <p className="text-xs text-muted">{t("privacy.gate.billingCheckError")}</p>
        <button
          type="button"
          onClick={() => void check()}
          className="flex min-h-11 w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("privacy.gate.retry")}
        </button>
      </div>
    );
  }
  if (state === "none") return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">{t("privacy.gate.subscriptionNote")}</p>
      <button
        type="button"
        onClick={cancel}
        disabled={canceling}
        className="flex min-h-11 w-full items-center justify-center rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-40 dark:border-red-800 dark:hover:bg-red-500/10"
      >
        {canceling ? <Loader2 className="mx-auto size-4 animate-spin" aria-hidden="true" /> : t("settings.subscriptionSection.cancelButton")}
      </button>
      <p className="text-[11px] text-muted/80">{t("settings.subscriptionSection.cancelNote")}</p>
    </div>
  );
}
