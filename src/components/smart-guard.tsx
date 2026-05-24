"use client";

/**
 * Smart Guards — Alopik v2 #4.
 *
 * Block creating a task before ≥1 reward exists, and vice-versa.
 * Forces the LOOP to be complete (Alopik's killer pattern).
 *
 * Adult-toned framing: friendly, not patronizing.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { useRouter } from "next/navigation";
import { X, Sparkles } from "lucide-react";

export type GuardKind = "missing-reward" | "missing-task";

type GuardConfig = {
  readonly emoji: string;
  readonly title: string;
  readonly body: string;
  readonly cta: string;
  readonly target: string;
};

const GUARDS: Record<GuardKind, GuardConfig> = {
  "missing-reward": {
    emoji: "🎁",
    title: "רגע — לפני שמוסיפים משימה, צריך פרס",
    body: "משימות עובדות יחד עם פרסים. כשמשלימים יעד — חוגגים עם משהו אמיתי. בלי פרס, המשחק לא מתחיל. זה לוקח 30 שניות.",
    cta: "ניצור פרס משותף (30 שניות)",
    target: "/rewards?focus=first",
  },
  "missing-task": {
    emoji: "✅",
    title: "רגע — לפני שמוסיפים פרס, צריך משימה",
    body: "פרס בלי משימה הוא רק חלום. אם אין מה לעשות כדי להגיע אליו, הוא לא בר-השגה. בואו נגדיר משימה אחת קטנה.",
    cta: "ניצור משימה ראשונה",
    target: "/tasks?focus=first",
  },
};

type Props = {
  readonly kind: GuardKind;
  readonly open: boolean;
  readonly onDismiss: () => void;
};

export function SmartGuard({ kind, open, onDismiss }: Props) {
  const router = useRouter();
  if (!open) return null;
  const config = GUARDS[kind];

  const handleProceed = () => {
    router.push(config.target);
    onDismiss();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sg-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onDismiss}
    >
      <div
        className="alopik-settle w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end px-3 pt-3">
          <button
            type="button"
            onClick={onDismiss}
            aria-label="סגור"
            className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 pb-6 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">
            {config.emoji}
          </div>
          <h2
            id="sg-title"
            className="text-lg font-bold text-gray-900 mb-2 text-balance"
          >
            {config.title}
          </h2>
          <p className="text-sm text-gray-600 mb-5 text-pretty leading-relaxed">
            {config.body}
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleProceed}
              className="w-full py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {config.cta}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2.5 rounded-lg text-gray-500 text-sm hover:text-gray-700"
            >
              אולי בפעם אחרת
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
