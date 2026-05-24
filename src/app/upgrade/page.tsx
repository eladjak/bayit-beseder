import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "שדרגו ל-Plus | בית בסדר",
  description:
    "פתחו את כל היכולות של בית בסדר — אשף תכנון שבועי חכם, סטטיסטיקה מלאה, מצב פסח, וקטגוריות מותאמות אישית. 30 יום ניסיון חינם.",
  robots: { index: false, follow: false },
};

type Plan = {
  readonly id: string;
  readonly name: string;
  readonly priceMonthly: string;
  readonly priceYearly: string;
  readonly emoji: string;
  readonly highlight?: boolean;
  readonly features: ReadonlyArray<string>;
  readonly ctaLabel: string;
};

const PLANS: ReadonlyArray<Plan> = [
  {
    id: "free",
    name: "חינמי",
    priceMonthly: "₪0",
    priceYearly: "₪0",
    emoji: "🌱",
    features: [
      "עד 50 משימות חוזרות",
      "סטטיסטיקה בסיסית",
      "Quick Love · Surprise Box · גלגל המזל",
      "חברים לדרך + רקעים (פתיחה לפי streak)",
      "מצב לילה, צלילים, רטט",
    ],
    ctaLabel: "אתם כבר כאן",
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthly: "₪19/חודש",
    priceYearly: "₪149/שנה (חיסכון ₪89)",
    emoji: "🌟",
    highlight: true,
    features: [
      "אשף תכנון שבועי חכם (Wizard) — לפי אזורים בבית",
      "סטטיסטיקה מלאה — מגמות, השוואות, יעדים",
      "מצב פסח — 37 משימות + 25 פריטי קניות",
      "קטגוריות מותאמות אישית בלי הגבלה",
      "ייצוא CSV של משימות והשלמות",
      "עד 4 בני משפחה כולל פרופילי ילדים",
    ],
    ctaLabel: "התחל 30 יום חינם",
  },
  {
    id: "family",
    name: "Family",
    priceMonthly: "₪29/חודש",
    priceYearly: "₪239/שנה (חיסכון ₪109)",
    emoji: "👨‍👩‍👧",
    features: [
      "כל מה ש-Plus כולל",
      "אישורי משימות הורה→ילד",
      "פרופילי ילדים נפרדים עם קודי כניסה",
      "WhatsApp daily briefs לכל המשפחה",
      "תזמון Google Calendar דו-כיווני",
      "תמיכה עדיפות בזמן יומיים",
    ],
    ctaLabel: "התחל 30 יום חינם",
  },
];

export default function UpgradePage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-rose-50 via-white to-amber-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" dir="rtl">
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold mb-4">
            <Sparkles className="size-3.5" aria-hidden="true" />
            30 יום ניסיון חינם · ביטול בכל רגע
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3 text-balance">
            בחרו את המסלול שמתאים לכם
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto text-pretty">
            הבית שלכם — בקצב שלכם. שדרגו רק כשמרגישים שזה שווה. בלי לחץ, בלי הפתעות.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 border-2 shadow-sm transition-transform hover:scale-[1.01] ${
                plan.highlight
                  ? "bg-gradient-to-br from-rose-500 to-violet-600 text-white border-rose-600"
                  : "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-200 dark:border-zinc-800"
              }`}
            >
              <div className="text-4xl mb-3" aria-hidden="true">{plan.emoji}</div>
              <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
              <p className={`text-2xl font-extrabold mb-1 tabular-nums ${plan.highlight ? "" : "text-gray-900 dark:text-white"}`}>
                {plan.priceMonthly}
              </p>
              <p className={`text-xs mb-5 ${plan.highlight ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
                או {plan.priceYearly}
              </p>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`size-4 shrink-0 mt-0.5 ${plan.highlight ? "text-white" : "text-emerald-600"}`}
                      aria-hidden="true"
                    />
                    <span className={plan.highlight ? "text-white/95" : ""}>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.id === "free" ? (
                <Link
                  href="/dashboard"
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm ${
                    plan.highlight
                      ? "bg-white text-rose-700 hover:bg-white/95"
                      : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300"
                  }`}
                >
                  {plan.ctaLabel}
                </Link>
              ) : (
                <a
                  href={`mailto:hello@bayitbeseder.com?subject=שדרוג%20ל-${encodeURIComponent(plan.name)}`}
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm ${
                    plan.highlight
                      ? "bg-white text-rose-700 hover:bg-white/95"
                      : "bg-rose-500 text-white hover:bg-rose-600"
                  }`}
                >
                  {plan.ctaLabel}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          תשלום מאובטח דרך Sumit · חיוב חודשי או שנתי לבחירתכם · ניתן לבטל בכל רגע מהפרופיל
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
