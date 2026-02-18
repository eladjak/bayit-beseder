"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Home,
  CheckCircle2,
  Users,
  Bell,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";

const ONBOARDING_KEY = "bayit-beseder-onboarding-done";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  detail?: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: <Home className="w-12 h-12 text-primary" />,
    title: "!ברוכים הבאים לבית בסדר",
    description:
      "האפליקציה שתעזור לכם לנהל את תחזוקת הבית יחד, בקלות ובכיף.",
    detail:
      "כל המטלות, ההתקדמות והסטטיסטיקות במקום אחד. בואו נתחיל!",
  },
  {
    icon: <CheckCircle2 className="w-12 h-12 text-success" />,
    title: "מטלות יומיות",
    description:
      "כל יום תראו את רשימת המטלות שלכם. סמנו מטלה כשסיימתם אותה - זה הכל!",
    detail:
      "המטלות מחולקות לקטגוריות: מטבח, סלון, חדרי שינה, אמבטיה, כביסה ועוד. אפשר להוסיף מטלות חדשות בכל רגע.",
  },
  {
    icon: <Users className="w-12 h-12 text-secondary" />,
    title: "עובדים ביחד",
    description:
      "אתם צוות! תראו מה בן/בת הזוג עשו, ותחגגו הצלחות ביחד.",
    detail:
      'מד ה"כלל הזהב" מראה את האיזון ביניכם. המטרה היא לא תחרות - אלא שיתוף פעולה!',
  },
  {
    icon: <Bell className="w-12 h-12 text-warning" />,
    title: "תזכורות חכמות",
    description:
      "נשלח לכם תזכורות עדינות כדי שלא תשכחו. בלי ספאם, מבטיחים.",
    detail:
      "תזכורת בוקר עם המטלות של היום, עדכון כשבן/בת הזוג סיימו מטלה, וסיכום שבועי.",
  },
  {
    icon: <Smartphone className="w-12 h-12 text-primary" />,
    title: "התקנה על הטלפון",
    description: "אפשר להתקין את האפליקציה ישירות על הטלפון בלחיצה אחת!",
    detail: "INSTALL_INSTRUCTIONS",
  },
];

function InstallInstructions() {
  const [platform, setPlatform] = useState<"iphone" | "android" | "unknown">(
    "unknown"
  );

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad/.test(ua)) {
      setPlatform("iphone");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    }
  }, []);

  return (
    <div className="w-full mt-2 space-y-3">
      {(platform === "iphone" || platform === "unknown") && (
        <div className="bg-surface rounded-xl p-4 border border-border">
          <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <span className="text-lg">🍎</span> iPhone / iPad
          </p>
          <ol className="space-y-1.5 text-sm text-muted list-decimal list-inside">
            <li>
              פתחו את האתר ב-<strong className="text-foreground">Safari</strong>
            </li>
            <li>
              לחצו על כפתור השיתוף{" "}
              <span className="inline-block px-1.5 py-0.5 bg-primary/10 rounded text-primary text-xs font-mono">
                ⬆️
              </span>{" "}
              (בתחתית המסך)
            </li>
            <li>
              גללו ובחרו{" "}
              <strong className="text-foreground">
                &quot;הוספה למסך הבית&quot;
              </strong>
            </li>
            <li>
              לחצו{" "}
              <strong className="text-foreground">&quot;הוספה&quot;</strong>
            </li>
          </ol>
        </div>
      )}

      {(platform === "android" || platform === "unknown") && (
        <div className="bg-surface rounded-xl p-4 border border-border">
          <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <span className="text-lg">🤖</span> Android
          </p>
          <ol className="space-y-1.5 text-sm text-muted list-decimal list-inside">
            <li>
              פתחו את האתר ב-
              <strong className="text-foreground">Chrome</strong>
            </li>
            <li>
              לחצו על שלוש הנקודות{" "}
              <span className="inline-block px-1.5 py-0.5 bg-primary/10 rounded text-primary text-xs font-mono">
                ⋮
              </span>{" "}
              (בפינה העליונה)
            </li>
            <li>
              בחרו{" "}
              <strong className="text-foreground">
                &quot;התקנת אפליקציה&quot;
              </strong>{" "}
              או{" "}
              <strong className="text-foreground">
                &quot;הוספה למסך הבית&quot;
              </strong>
            </li>
            <li>
              לחצו{" "}
              <strong className="text-foreground">&quot;התקנה&quot;</strong>
            </li>
          </ol>
        </div>
      )}

      <p className="text-xs text-muted text-center">
        אחרי ההתקנה, האפליקציה תופיע כאייקון על המסך הראשי
      </p>
    </div>
  );
}

export function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDone = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
  }, []);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleDone();
    }
  }, [step, handleDone]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-background rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header with skip */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 bg-primary"
                    : i < step
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleDone}
            className="p-1 text-muted hover:text-foreground transition-colors"
            aria-label="דלג"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            {current.icon}
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">
            {current.title}
          </h2>

          <p className="text-muted text-sm leading-relaxed mb-3">
            {current.description}
          </p>

          {current.detail === "INSTALL_INSTRUCTIONS" ? (
            <InstallInstructions />
          ) : (
            current.detail && (
              <p className="text-xs text-muted/80 leading-relaxed bg-surface rounded-xl p-3 w-full">
                {current.detail}
              </p>
            )
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6 flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={handlePrev}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          >
            {isLast ? (
              <>
                <Sparkles className="w-4 h-4" />
                {"!בואו נתחיל"}
              </>
            ) : (
              <>
                {"הבא"}
                <ChevronLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
