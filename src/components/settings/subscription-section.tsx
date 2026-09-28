"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Settings → "My subscription" section. Owns:
 *  - reading ?upgrade=success / ?upgrade=cancelled from the Sumit checkout
 *    RedirectURL and rendering an honest pending state (Plus is NOT claimed
 *    active until the webhook has actually landed and the DB row flips —
 *    see how-elad-gets-told / agent-standing-autonomy: don't tell the user
 *    something happened before it actually did)
 *  - showing the real current tier/status/renewal date
 *  - the upgrade CTA (POST /api/sumit/checkout) and cancel CTA
 *    (POST /api/sumit/cancel-subscription)
 *
 * Wrapped in its own <Suspense> because useSearchParams() requires one in
 * the App Router — same pattern as src/app/(auth)/login/page.tsx.
 */
export function SubscriptionSection() {
  return (
    <Suspense fallback={<div className="h-16" />}>
      <SubscriptionSectionContent />
    </Suspense>
  );
}

function SubscriptionSectionContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const searchParams = useSearchParams();
  const householdId = profile?.household_id ?? null;
  const { status, currentPeriodEnd, canceledAt, loading, isPlus, refresh } =
    useSubscription(householdId);

  const [checkingOut, setCheckingOut] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const upgradeParam = searchParams.get("upgrade");

  // Sumit's RedirectURL always lands here with ?upgrade=success, whether the
  // payment actually succeeded or not — Sumit's hosted checkout redirects on
  // completion, not on confirmed webhook delivery. The DB row (and therefore
  // `isPlus`) only flips once /api/sumit/webhook has actually run. So this
  // banner says "confirming", never "done", until isPlus catches up.
  const pendingConfirmation = upgradeParam === "success" && !loading && !isPlus;

  useEffect(() => {
    if (upgradeParam !== "success") return;
    // Give the webhook a moment to land, then re-check once.
    const timer = setTimeout(() => refresh(), 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgradeParam]);

  useEffect(() => {
    if (upgradeParam === "success" && isPlus) {
      toast.success(t("subscriptionSection.plusStatus"));
    }
    if (upgradeParam === "cancelled") {
      toast.info(t("subscriptionSection.canceledStatus"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgradeParam, isPlus]);

  async function handleUpgrade() {
    if (!user || !householdId) return;
    setCheckingOut(true);
    try {
      const res = await fetch("/api/sumit/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        toast.error(data.error || t("subscriptionSection.upgradeError"));
        setCheckingOut(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error(t("subscriptionSection.upgradeError"));
      setCheckingOut(false);
    }
  }

  async function handleCancel() {
    if (!householdId) return;
    if (!confirm(t("subscriptionSection.cancelConfirm"))) return;
    setCanceling(true);
    try {
      const res = await fetch("/api/sumit/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("subscriptionSection.cancelError"));
        setCanceling(false);
        return;
      }
      toast.success(t("subscriptionSection.cancelSuccess"));
      refresh();
    } catch {
      toast.error(t("subscriptionSection.cancelError"));
    } finally {
      setCanceling(false);
    }
  }

  const statusLabel =
    status === "past_due"
      ? t("subscriptionSection.pastDueStatus")
      : status === "canceled"
        ? t("subscriptionSection.canceledStatus")
        : isPlus
          ? t("subscriptionSection.plusStatus")
          : t("subscriptionSection.freeStatus");

  return (
    <div className="space-y-3">
      {pendingConfirmation && (
        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 px-3 py-2.5 text-sm text-indigo-700 dark:text-indigo-300">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          <span>מאשרים את התשלום מול Sumit… זה בדרך כלל לוקח כמה שניות.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${isPlus ? "text-indigo-500" : "text-muted"}`} aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">{statusLabel}</span>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted" aria-hidden="true" />}
      </div>

      {isPlus && currentPeriodEnd && !canceledAt && (
        <p className="text-xs text-muted">
          {t("subscriptionSection.renewsOn")}: {new Date(currentPeriodEnd).toLocaleDateString("he-IL")}
        </p>
      )}

      {status === "canceled" && canceledAt && (
        <p className="text-xs text-muted">
          {t("subscriptionSection.canceledOn")}: {new Date(canceledAt).toLocaleDateString("he-IL")}
        </p>
      )}

      {isPlus ? (
        <button
          type="button"
          onClick={handleCancel}
          disabled={canceling}
          className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
        >
          {canceling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-hidden="true" /> : t("subscriptionSection.cancelButton")}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={checkingOut || !user}
          className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-40"
        >
          {checkingOut ? <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-hidden="true" /> : t("subscriptionSection.upgradeButton")}
        </button>
      )}

      {isPlus && (
        <p className="text-[11px] text-muted/80">{t("subscriptionSection.cancelNote")}</p>
      )}
    </div>
  );
}
