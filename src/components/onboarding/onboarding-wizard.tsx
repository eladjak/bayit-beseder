"use client";

import { useNewUi } from "@/hooks/useNewUi";

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
import { ChevronLeft, ChevronRight, X, Sparkles, Home } from "lucide-react";
import {
  loadHousehold,
  saveHousehold,
  TYPE_LABELS,
  type HouseholdType,
} from "@/lib/household-type";
import { useTranslation } from "@/hooks/useTranslation";

type Step = {
  readonly id: string;
  readonly emoji: string;
  readonly titleKey: string;
  readonly bodyKey: string;
  readonly ctaKey: string;
  readonly customRender?: boolean;
};

const STEPS: ReadonlyArray<Step> = [
  {
    id: "welcome",
    emoji: "🏡",
    titleKey: "onboardingTour.welcome.title",
    bodyKey: "onboardingTour.welcome.body",
    ctaKey: "onboardingTour.welcome.cta",
  },
  {
    id: "household-type",
    emoji: "🏘️",
    titleKey: "onboardingTour.householdType.title",
    bodyKey: "onboardingTour.householdType.body",
    ctaKey: "onboardingTour.householdType.cta",
    customRender: true,
  },
  {
    id: "couple",
    emoji: "👥",
    titleKey: "onboardingTour.couple.title",
    bodyKey: "onboardingTour.couple.body",
    ctaKey: "onboardingTour.couple.cta",
  },
  {
    id: "first-tasks",
    emoji: "✅",
    titleKey: "onboardingTour.firstTasks.title",
    bodyKey: "onboardingTour.firstTasks.body",
    ctaKey: "onboardingTour.firstTasks.cta",
  },
  {
    id: "first-reward",
    emoji: "🎁",
    titleKey: "onboardingTour.firstReward.title",
    bodyKey: "onboardingTour.firstReward.body",
    ctaKey: "onboardingTour.firstReward.cta",
  },
  {
    id: "ready",
    emoji: "🚀",
    titleKey: "onboardingTour.ready.title",
    bodyKey: "onboardingTour.ready.body",
    ctaKey: "onboardingTour.ready.cta",
  },
] as const;

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onComplete: () => void;
};

function OnboardingWizardV1({ open, onClose, onComplete }: Props) {
  const { t } = useTranslation();
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
      role="region"
      aria-labelledby="ob-title"
      className="px-4 pt-4"
    >
      <div className="w-full rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-indigo-600 transition-transform duration-300 ease-out origin-right"
            style={{
              transform: `scaleX(${(stepIndex + 1) / STEPS.length})`,
            }}
            aria-label={t("onboardingTour.progressLabel")
              .replace("{current}", String(stepIndex + 1))
              .replace("{total}", String(STEPS.length))}
          />
        </div>

        {/* Skip / close */}
        <div className="flex justify-between items-center px-4 py-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 text-sm text-gray-600 hover:text-gray-800 px-2"
          >
            {t("onboardingTour.skip")}
          </button>
          <span className="text-xs text-gray-400 tabular-nums">
            {stepIndex + 1}/{STEPS.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("onboardingTour.close")}
            className="size-11 rounded-full hover:bg-gray-100 flex items-center justify-center"
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
            <Home className="size-10 mx-auto text-primary" />
          </div>
          <h2 id="ob-title" className="text-xl font-bold text-gray-900 mb-3 text-balance">
            {t(step.titleKey)}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed text-pretty mb-4">
            {t(step.bodyKey)}
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
                      className={`bb-pop text-start p-3 rounded-2xl border-2 overflow-hidden ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/70 shadow-[0_8px_24px_-8px_rgba(99,102,241,0.35)]"
                          : "border-transparent bg-white hover:border-indigo-200"
                      }`}
                    >
                      <div className="relative mb-2 rounded-xl overflow-hidden aspect-[4/3] bg-indigo-50/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={label.illustration}
                          alt={`איור: ${label.label}`}
                          loading="lazy"
                          className="bb-illus size-full"
                        />
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
                <span className="text-sm text-gray-700">{t("onboardingTour.householdType.hasKids")}</span>
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
                {t("onboardingTour.prev")}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center gap-1"
            >
              {isLast && <Sparkles className="size-4" aria-hidden="true" />}
              {t(step.ctaKey)}
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

export function OnboardingWizard(props: Props) {
  const newUi = useNewUi();
  return newUi ? null : <OnboardingWizardV1 {...props} />;
}
