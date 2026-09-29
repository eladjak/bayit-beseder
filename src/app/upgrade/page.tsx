"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubscription, FEATURE_MATRIX, type GatedFeature } from "@/hooks/useSubscription";

// Real, single-source-of-truth feature list — pulled from the same matrix
// that server-side gating and UpgradePrompt read, so this page can never
// promise a feature that isn't actually gated/unlocked anywhere.
const PLUS_FEATURE_KEYS: GatedFeature[] = Array.from(FEATURE_MATRIX.plus);

const FEATURE_I18N_KEYS: Record<GatedFeature, string> = {
  wizard: "upgrade.features.wizard",
  stats_full: "upgrade.features.stats",
  coaching: "upgrade.features.coaching",
  seasonal: "upgrade.features.seasonal",
  zone_scheduling: "upgrade.features.zone_scheduling",
  custom_categories: "upgrade.features.categories",
  whatsapp: "upgrade.features.whatsapp",
  unlimited_tasks: "upgrade.features.unlimited_tasks",
  achievements_full: "upgrade.features.achievements_full",
  weekly_challenges: "upgrade.features.weekly_challenges",
  leaderboard: "upgrade.features.leaderboard",
  export: "upgrade.features.export",
};

export default function UpgradePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isPlus, loading: subLoading } = useSubscription(profile?.household_id ?? null);
  const [checkingOut, setCheckingOut] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error(t("export.loginRequired"));
      return;
    }
    if (!profile?.household_id) {
      toast.error(t("subscriptionSection.upgradeError"));
      return;
    }
    setCheckingOut(true);
    try {
      const res = await fetch("/api/sumit/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: profile.household_id }),
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
  };

  const freeFeatures = [
    "עד 50 משימות חוזרות",
    "רשימת קניות משותפת ללא הגבלה",
    "סטטיסטיקה בסיסית",
    "Quick Love · Surprise Box · גלגל המזל",
    "חברים לדרך + רקעים (פתיחה לפי streak)",
    "מצב לילה, צלילים, רטט",
  ];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-indigo-50 via-white to-violet-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" dir="rtl">
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold mb-4">
            <Sparkles className="size-3.5" aria-hidden="true" />
            19₪ לחודש למשק בית · בלי התחייבות שנתית
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3 text-balance">
            בחרו את המסלול שמתאים לכם
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto text-pretty">
            משימות ורשימת קניות — תמיד בחינם. מסלול Plus מוסיף יכולות AI כשתרגישו שזה שווה.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl p-6 border-2 shadow-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-200 dark:border-zinc-800">
            <div className="text-4xl mb-3" aria-hidden="true">🌱</div>
            <h2 className="text-lg font-bold mb-1">חינמי</h2>
            <p className="text-2xl font-extrabold mb-1 tabular-nums text-gray-900 dark:text-white">₪0</p>
            <p className="text-xs mb-5 text-gray-500 dark:text-gray-400">לתמיד</p>

            <ul className="space-y-2 mb-6">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="size-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300"
            >
              {isPlus ? "חזרה לאפליקציה" : "אתם כבר כאן"}
            </Link>
          </div>

          {/* Plus */}
          <div className="rounded-2xl p-6 border-2 shadow-sm transition-transform hover:scale-[1.01] bg-gradient-to-br from-indigo-600 to-violet-600 text-white border-indigo-600">
            <div className="text-4xl mb-3" aria-hidden="true">🌟</div>
            <h2 className="text-lg font-bold mb-1">Plus (AI)</h2>
            <p className="text-2xl font-extrabold mb-1 tabular-nums">₪19/חודש למשק בית</p>
            <p className="text-xs mb-5 text-white/80">חיוב חודשי, ניתן לבטל בכל רגע</p>

            <ul className="space-y-2 mb-6">
              {PLUS_FEATURE_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm">
                  <Check className="size-4 shrink-0 mt-0.5 text-white" aria-hidden="true" />
                  <span className="text-white/95">{t(FEATURE_I18N_KEYS[key])}</span>
                </li>
              ))}
            </ul>

            {subLoading ? (
              <div className="w-full flex items-center justify-center py-3">
                <Loader2 className="size-5 animate-spin text-white/80" aria-hidden="true" />
              </div>
            ) : isPlus ? (
              <Link
                href="/settings"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-white text-indigo-700 hover:bg-white/95"
              >
                Plus כבר פעיל אצלכם
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={checkingOut}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-white text-indigo-700 hover:bg-white/95 disabled:opacity-60"
              >
                {checkingOut ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    שדרגו ל-Plus
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          תשלום מאובטח דרך Sumit · חיוב חודשי · ניתן לבטל מההגדרות
        </p>

        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            ← חזרה לאפליקציה
          </Link>
        </div>
      </div>
    </div>
  );
}
