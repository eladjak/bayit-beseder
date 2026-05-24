"use client";

/**
 * Adult-toned Onboarding Wizard — Alopik v2 #3.
 *
 * 5-step wizard. Skippable + re-triggerable from settings.
 * Time-aware suggestions. Seeded examples (not empty state).
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 * Tone: warm, direct, NOT childish. "בואו נתחיל" not "🎉 ברוך הבא!".
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import {
  loadHousehold,
  saveHousehold,
  TYPE_LABELS,
  type HouseholdType,
} from "@/lib/household-type";

type Step = {
  readonly id: string;
  readonly emoji: string;
  readonly title: string;
  readonly body: string;
  readonly cta?: string;
  readonly customRender?: boolean;
};

const STEPS: ReadonlyArray<Step> = [
  {
    id: "welcome",
    emoji: "🏡",
    title: "ברוכים הבאים לבית בסדר",
    body: "אפליקציה שבונה ביחד הרגלים יומיים, מחזירה את הקלילות לבית, וחוגגת את הניסיונות לא רק את ההצלחות.",
    cta: "בואו נתחיל",
  },
  {
    id: "household-type",
    emoji: "🏘️",
    title: "מי גרים אצלכם?",
    body: "בחרו את ההרכב — כל מסך יותאם לפי זה.",
    cta: "הבא",
    customRender: true,
  },
  {
    id: "couple",
    emoji: "👥",
    title: "הצוות שלכם — הליבה",
    body: "תוסיפו את כל מי שגר בבית. כל מה שתעשו יהיה ביניכם בלבד — אין שיפוט, אין השוואות חיצוניות. רק אתם.",
    cta: "הבא",
  },
  {
    id: "first-tasks",
    emoji: "✅",
    title: "3 משימות ראשונות",
    body: "אל תכבידו על עצמכם. בחרו 3 משימות שאתם כבר עושים — וגם זה יספור. ההצלחה מתחילה במה שכבר קורה.",
    cta: "הבא",
  },
  {
    id: "first-reward",
    emoji: "🎁",
    title: "פרס משותף ראשון",
    body: "מה תעשו ביחד כשתשלימו שבוע? ערב סרט, ארוחה בחוץ, בוקר עצלן — אתם בוחרים. המוטיבציה חייבת להיות אמיתית, לא דמיונית.",
    cta: "הבא",
  },
  {
    id: "ready",
    emoji: "🚀",
    title: "מוכנים?",
    body: "מהיום אתם משחקים. אין עונשים, אין דחיפות אגרסיביות. אם פספסתם — הinventory מתאפס בשקט. ההתייצבות היא הניצחון.",
    cta: "יאללה לדרך",
  },
] as const;

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onComplete: () => void;
};

export function OnboardingWizard({ open, onClose, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedType, setSelectedType] = useState<HouseholdType>(() =>
    typeof window !== "undefined" ? loadHousehold().type : "couple",
  );
  const [hasKids, setHasKids] = useState<boolean>(() =>
    typeof window !== "undefined" ? loadHousehold().hasKids : false,
  );

  if (!open) return null;
  const step = STEPS[stepIndex];
  if (!step) return null;

  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const handleNext = () => {
    // Persist household type when leaving the household-type step
    if (step.id === "household-type") {
      saveHousehold({
        type: selectedType,
        hasKids,
        memberCount: selectedType === "solo" ? 1 : selectedType === "family" ? (hasKids ? 4 : 3) : 2,
      });
    }
    if (isLast) {
      onComplete();
      setStepIndex(0);
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStepIndex(stepIndex - 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ob-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="alopik-settle w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-indigo-600 transition-transform duration-300 ease-out origin-right"
            style={{
              transform: `scaleX(${(stepIndex + 1) / STEPS.length})`,
            }}
            aria-label={`שלב ${stepIndex + 1} מתוך ${STEPS.length}`}
          />
        </div>

        {/* Skip / close */}
        <div className="flex justify-between items-center px-4 py-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            דלג
          </button>
          <span className="text-xs text-gray-400 tabular-nums">
            {stepIndex + 1}/{STEPS.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="size-7 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Step content */}
        <div className="px-6 pb-6 pt-2 text-center">
          <div
            className="text-6xl mb-4"
            aria-hidden="true"
            key={step.id}
            style={{ animation: "fadeInScale 240ms ease-out" }}
          >
            {step.emoji}
          </div>
          <h2 id="ob-title" className="text-xl font-bold text-gray-900 mb-3 text-balance">
            {step.title}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed text-pretty mb-4">
            {step.body}
          </p>

          {step.customRender && step.id === "household-type" && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(Object.keys(TYPE_LABELS) as HouseholdType[]).map((t) => {
                  const label = TYPE_LABELS[t];
                  const isSelected = selectedType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedType(t)}
                      aria-pressed={isSelected}
                      className={`text-start p-3 rounded-xl border-2 transition-transform duration-150 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-2xl mb-1" aria-hidden="true">
                        {label.emoji}
                      </div>
                      <div className="text-sm font-bold text-gray-900">{label.label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5 text-pretty">
                        {label.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasKids}
                  onChange={(e) => setHasKids(e.target.checked)}
                  className="size-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700">יש לנו ילדים 👶</span>
              </label>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-1"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
                הקודם
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center gap-1"
            >
              {isLast && <Sparkles className="size-4" aria-hidden="true" />}
              {step.cta ?? "הבא"}
              {!isLast && <ChevronLeft className="size-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

/** localStorage key — onboarding completion flag */
export const ONBOARDING_DONE_KEY = "bayit-onboarding-done-v1";

export function isOnboardingDone(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
}

export function markOnboardingDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_DONE_KEY, "1");
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_DONE_KEY);
}
