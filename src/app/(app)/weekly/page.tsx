"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  MapPin,
  Users,
  CalendarDays,
  Heart,
  CheckCircle2,
  Timer,
} from "lucide-react";

const STEPS = [
  { icon: ClipboardList, title: "סקירת השבוע", description: "מה הצלחנו? מה פספסנו?" },
  { icon: MapPin, title: "אזורים", description: "באילו אזורים נתמקד השבוע?" },
  { icon: Users, title: "חלוקת משימות", description: "מי עושה מה השבוע?" },
  { icon: CalendarDays, title: "אירועים מיוחדים", description: "אורחים? חגים? נסיעות?" },
  { icon: Heart, title: "תמיכה הדדית", description: "איך נעזור אחד לשני?" },
] as const;

export default function WeeklyPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function completeStep(step: number) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
    if (step < STEPS.length - 1) {
      setCurrentStep(step + 1);
    }
  }

  const allDone = completedSteps.size === STEPS.length;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-primary rounded-b-3xl px-4 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">סנכרון שבועי</h1>
            <p className="text-sm text-white/60">10 דקות ביחד לשבוע טוב יותר</p>
          </div>
          <button
            onClick={() => setTimerActive((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              timerActive
                ? "bg-white text-primary shadow-md"
                : "bg-white/15 text-white/80 backdrop-blur-sm"
            }`}
          >
            <Timer className="w-4 h-4" />
            {formatTime(elapsed)}
          </button>
        </div>
      </div>

      <div className="px-4 space-y-5">

      {/* Progress Bar */}
      <div className="h-2 bg-border/30 rounded-full overflow-hidden">
        <motion.div
          className="h-full gradient-primary rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${(completedSteps.size / STEPS.length) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.has(i);
          const isCurrent = currentStep === i;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`card-elevated p-4 transition-all ${
                isCurrent
                  ? "ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                  : isCompleted
                    ? "ring-1 ring-success/20"
                    : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? "bg-success/10"
                      : isCurrent
                        ? "bg-primary/10"
                        : "bg-background"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Icon
                      className={`w-5 h-5 ${
                        isCurrent ? "text-primary" : "text-muted"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted">{step.description}</p>
                </div>
                {!isCompleted && isCurrent && (
                  <button
                    onClick={() => completeStep(i)}
                    className="px-3 py-1 rounded-lg gradient-primary text-white text-xs font-medium shadow-sm shadow-primary/20"
                  >
                    סיום
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">הערות</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="הערות לשבוע הקרוב..."
          className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          dir="rtl"
        />
      </div>

      {allDone && (
        <motion.div
          className="card-elevated bg-success/10 p-4 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span className="text-3xl block mb-2">🙌</span>
          <p className="font-bold text-success">הסנכרון הושלם!</p>
          <p className="text-sm text-muted mt-1">
            זמן כולל: {formatTime(elapsed)}
          </p>
        </motion.div>
      )}
      </div>
    </div>
  );
}
