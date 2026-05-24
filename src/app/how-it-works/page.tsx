import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "איך זה עובד | בית בסדר",
  description:
    "3 צעדים פשוטים להפוך את הבית למסודר בלי ויכוחים. כל זוג, משפחה, או שותפים יכולים להתחיל תוך דקה.",
};

type Step = {
  readonly number: string;
  readonly emoji: string;
  readonly title: string;
  readonly body: string;
  readonly tip: string;
};

const STEPS: ReadonlyArray<Step> = [
  {
    number: "1",
    emoji: "🤝",
    title: "מתחברים ביחד",
    body: "אתם נרשמים בחינם, מצרפים את השותף/ה (או המשפחה כולה), ובוחרים האם אתם זוג / משפחה / שותפים / סינגלים.",
    tip: "30 שניות עד שהבית הראשון שלכם פתוח.",
  },
  {
    number: "2",
    emoji: "✅",
    title: "בוחרים 3 משימות שעובדות לכם",
    body: "אל תכבידו על עצמכם. תבחרו 3 משימות יומיומיות שאתם כבר עושים — אנחנו נחגוג גם אותן. ההצלחה מתחילה במה שכבר קורה.",
    tip: "אפשר להוסיף מהקטלוג שלנו או לכתוב משלכם.",
  },
  {
    number: "3",
    emoji: "🎁",
    title: "צוברים, חוגגים, פותחים",
    body: "כל משימה = נקודות. כל יום מצליח = streak. כל 50 נקודות = מדליה. פטים ורקעים נפתחים אוטומטית. גלגל מזל ביום שישי. חברים שולחים זה לזה לבבות.",
    tip: "אין עונשים. רק חיזוקים חיוביים. כי משחק.",
  },
];

export default function HowItWorksPage() {
  return (
    <div
      className="min-h-dvh bg-gradient-to-b from-rose-50 via-white to-amber-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950"
      dir="rtl"
    >
      <div className="max-w-3xl mx-auto px-5 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold mb-4">
            <Sparkles className="size-3.5" aria-hidden="true" />
            הסבר 30 שניות
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3 text-balance">
            איך זה עובד?
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto text-pretty">
            3 צעדים פשוטים. בלי הרצאות, בלי טפסים, בלי ויכוחים. הבית מסודר ביחד.
          </p>
        </div>

        <div className="space-y-4 mb-10">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 shadow-sm flex items-start gap-4"
            >
              <div className="shrink-0 size-14 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-600 text-white text-2xl font-extrabold flex items-center justify-center shadow-md tabular-nums">
                {step.number}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl" aria-hidden="true">{step.emoji}</span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{step.title}</h2>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-pretty mb-2">
                  {step.body}
                </p>
                <p className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{step.tip}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-l from-rose-500 to-violet-600 text-white font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-transform"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            בואו נתחיל — חינם
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
          <p className="text-xs text-gray-500 mt-3">
            אין צורך בכרטיס אשראי · עובד מהדפדפן · בעברית RTL מלאה
          </p>
        </div>
      </div>
    </div>
  );
}
