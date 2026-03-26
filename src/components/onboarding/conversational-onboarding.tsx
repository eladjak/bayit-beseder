"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Check, Sparkles, Home, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useTranslation } from "@/hooks/useTranslation";

const VoiceInputButton = dynamic(
  () => import("@/components/voice-input-button").then((m) => m.VoiceInputButton),
  { ssr: false }
);

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface ConversationalOnboardingProps {
  open: boolean;
  onComplete: (result: OnboardingResult) => void;
  onSkip: () => void;
}

export interface OnboardingResult {
  homeName: string;
  roomCount: RoomCount;
  residents: Set<ResidentType>;
  kidCount: number;
  style: CleaningStyle;
  dailyMinutes: DailyMinutes;
  tasks: TaskTemplate[];
}

export interface TaskTemplate {
  title: string;
  category: string;
  estimatedMinutes: number;
  recurring: boolean;
  frequency: "daily" | "weekly" | "monthly";
}

type RoomCount = "studio" | "2" | "3" | "4" | "5+";
type ResidentType = "couple" | "kids" | "pets" | "parents";
type CleaningStyle = "sprint" | "daily";
type DailyMinutes = 15 | 30 | 60;

// ────────────────────────────────────────────────────────────────────────────
// Task Templates (DO NOT translate — content goes into the DB)
// ────────────────────────────────────────────────────────────────────────────

const TASK_TEMPLATES: TaskTemplate[] = [
  // Kitchen — daily
  { title: "שטיפת כלים / הפעלת מדיח", category: "kitchen", estimatedMinutes: 15, recurring: true, frequency: "daily" },
  { title: "ניקוי משטחי עבודה במטבח", category: "kitchen", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  { title: "טאטוא רצפת מטבח", category: "kitchen", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  { title: "הוצאת אשפה", category: "kitchen", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  // Kitchen — weekly
  { title: "ניקוי עמוק של כיריים", category: "kitchen", estimatedMinutes: 20, recurring: true, frequency: "weekly" },
  { title: "ניקוי מיקרוגל", category: "kitchen", estimatedMinutes: 10, recurring: true, frequency: "weekly" },
  { title: "ארגון מזווה", category: "kitchen", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  // Bathroom
  { title: "ניגוב כיור האמבטיה", category: "bathroom", estimatedMinutes: 3, recurring: true, frequency: "daily" },
  { title: "ניקוי שירותים", category: "bathroom", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  { title: "ניקוי מקלחת", category: "bathroom", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  { title: "החלפת מגבות", category: "bathroom", estimatedMinutes: 5, recurring: true, frequency: "weekly" },
  // Living
  { title: "סידור מהיר של הסלון", category: "living", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  { title: "איוורור הבית", category: "living", estimatedMinutes: 2, recurring: true, frequency: "daily" },
  { title: "שאיבת אבק בסלון", category: "living", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  { title: "ניגוב אבק ממשטחים", category: "living", estimatedMinutes: 10, recurring: true, frequency: "weekly" },
  { title: "ניקוי רצפות", category: "living", estimatedMinutes: 20, recurring: true, frequency: "weekly" },
  // Bedroom
  { title: "עריכת המיטה", category: "bedroom", estimatedMinutes: 3, recurring: true, frequency: "daily" },
  { title: "שאיבת אבק בחדרי שינה", category: "bedroom", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  { title: "החלפת מצעים", category: "bedroom", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  // Laundry
  { title: "הרצת מכונת כביסה", category: "laundry", estimatedMinutes: 5, recurring: true, frequency: "weekly" },
  { title: "תליית / ייבוש כביסה", category: "laundry", estimatedMinutes: 10, recurring: true, frequency: "weekly" },
  { title: "קיפול וסידור כביסה", category: "laundry", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  // General
  { title: "איסוף בגדים מלוכלכים לסל", category: "general", estimatedMinutes: 3, recurring: true, frequency: "daily" },
  { title: "ארגון וסידור כללי", category: "general", estimatedMinutes: 10, recurring: true, frequency: "weekly" },
  // Pets
  { title: "האכלת חיות מחמד", category: "pets", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  { title: "מים טריים לחיות מחמד", category: "pets", estimatedMinutes: 2, recurring: true, frequency: "daily" },
  { title: "ניקוי ארגז חול / כלוב", category: "pets", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  { title: "הוצאת כלב לטיול", category: "pets", estimatedMinutes: 20, recurring: true, frequency: "daily" },
  // Kids
  { title: "סידור צעצועים", category: "kids", estimatedMinutes: 10, recurring: true, frequency: "daily" },
  { title: "ניקוי חדר ילדים", category: "kids", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  // Outdoor
  { title: "השקיית צמחים", category: "outdoor", estimatedMinutes: 10, recurring: true, frequency: "daily" },
  { title: "ניקוי מרפסת", category: "outdoor", estimatedMinutes: 20, recurring: true, frequency: "weekly" },
];

// ────────────────────────────────────────────────────────────────────────────
// Plan generation
// ────────────────────────────────────────────────────────────────────────────

function generatePlan(
  roomCount: RoomCount,
  residents: Set<ResidentType>,
  style: CleaningStyle,
  dailyMinutes: DailyMinutes,
): TaskTemplate[] {
  const hasPets = residents.has("pets");
  const hasKids = residents.has("kids");
  // More rooms = more weekly cleaning tasks
  const roomMultiplier = roomCount === "studio" ? 0.6 : roomCount === "2" ? 0.8 : roomCount === "5+" ? 1.3 : 1;

  const filtered = TASK_TEMPLATES.filter((t) => {
    if (t.category === "pets" && !hasPets) return false;
    if (t.category === "kids" && !hasKids) return false;
    // Studio: skip bedroom-specific
    if (roomCount === "studio" && t.category === "bedroom") return false;
    return true;
  });

  const freqOrder: Record<string, number> = { daily: 0, weekly: 1, monthly: 2 };
  const sorted = [...filtered].sort(
    (a, b) => freqOrder[a.frequency] - freqOrder[b.frequency] || a.estimatedMinutes - b.estimatedMinutes,
  );

  const dailyTasks = sorted.filter((t) => t.frequency === "daily");
  const weeklyTasks = sorted.filter((t) => t.frequency === "weekly");

  const selected: TaskTemplate[] = [];

  // Sprint style = fewer daily, more weekly deep cleans
  // Daily style = more daily maintenance
  const dailyBudget = style === "sprint" ? Math.floor(dailyMinutes * 0.6) : dailyMinutes;

  let budget = dailyBudget;
  for (const t of dailyTasks) {
    if (budget <= 0) break;
    selected.push(t);
    budget -= t.estimatedMinutes;
  }

  const weeklyBudget = Math.round((dailyMinutes >= 30 ? 8 : 5) * roomMultiplier);
  for (const t of weeklyTasks.slice(0, weeklyBudget)) {
    selected.push(t);
  }

  return selected;
}

// ────────────────────────────────────────────────────────────────────────────
// Animation
// ────────────────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: { y: 40, opacity: 0 },
  center: { y: 0, opacity: 1 },
  exit: { y: -40, opacity: 0 },
};

// ────────────────────────────────────────────────────────────────────────────
// Shared UI components
// ────────────────────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-primary"
              : i < current
                ? "w-2 bg-primary/50"
                : "w-2 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function OptionCard({
  emoji,
  label,
  sublabel,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      aria-pressed={selected}
      className={`relative flex items-center gap-3 w-full p-4 rounded-2xl border-2 transition-colors text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-surface hover:border-primary/30"
      }`}
    >
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1">
        <p className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-muted mt-0.5">{sublabel}</p>}
      </div>
      {selected && (
        <span className="bg-primary rounded-full p-0.5 shrink-0" aria-hidden="true">
          <Check className="w-3.5 h-3.5 text-white" />
        </span>
      )}
    </motion.button>
  );
}

function GridCard({
  emoji,
  label,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      aria-pressed={selected}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-surface hover:border-primary/30"
      }`}
    >
      {selected && (
        <span className="absolute top-2 start-2 bg-primary rounded-full p-0.5" aria-hidden="true">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}
      <span className="text-3xl" aria-hidden="true">{emoji}</span>
      <span className={`text-xs font-medium ${selected ? "text-primary" : "text-foreground"}`}>
        {label}
      </span>
    </motion.button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step screens
// ────────────────────────────────────────────────────────────────────────────

type TFn = (key: string) => string;

function StepWelcome({ onNext, t }: { onNext: () => void; t: TFn }) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full px-2">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", damping: 20 }}
        className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6"
      >
        <Home className="w-10 h-10 text-primary" />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-foreground mb-3"
      >
        {t("onboarding.welcomeTitle")}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted text-sm leading-relaxed max-w-xs mb-8"
      >
        {t("onboarding.welcomeSubtitle")}
      </motion.p>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        className="gradient-primary text-white font-semibold px-8 py-3 rounded-2xl flex items-center gap-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Sparkles className="w-4 h-4" aria-hidden="true" />
        {t("onboarding.letsStart")}
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xs text-muted mt-4"
      >
        {t("onboarding.takesLessThanMinute")}
      </motion.p>
    </div>
  );
}

function StepHomeName({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: TFn;
}) {
  const suggestions = [
    t("onboarding.homeNameSuggestion1"),
    t("onboarding.homeNameSuggestion2"),
    t("onboarding.homeNameSuggestion3"),
  ];

  return (
    <div className="pt-4">
      <h2 className="text-xl font-bold text-foreground mb-2">
        {t("onboarding.homeNameTitle")}
      </h2>
      <p className="text-sm text-muted mb-6">{t("onboarding.homeNameSubtitle")}</p>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("onboarding.homeNamePlaceholder")}
          aria-label={t("onboarding.homeNameAriaLabel")}
          className="flex-1 px-4 py-3 rounded-2xl border-2 border-border bg-surface text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors text-right text-sm"
          autoFocus
          dir="rtl"
        />
        <VoiceInputButton
          onTranscript={(text) => onChange(text)}
          ariaLabel={t("voice.record")}
          className="flex-shrink-0 w-10 h-10"
        />
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={value === s}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              value === s
                ? "bg-primary text-white"
                : "bg-surface border border-border text-muted hover:border-primary/40"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepRoomCount({
  value,
  onChange,
  t,
}: {
  value: RoomCount;
  onChange: (v: RoomCount) => void;
  t: TFn;
}) {
  const roomOptions: { value: RoomCount; emoji: string; label: string }[] = [
    { value: "studio", emoji: "🏠", label: t("onboarding.roomStudio") },
    { value: "2", emoji: "🏡", label: t("onboarding.room2") },
    { value: "3", emoji: "🏡", label: t("onboarding.room3") },
    { value: "4", emoji: "🏘️", label: t("onboarding.room4") },
    { value: "5+", emoji: "🏰", label: t("onboarding.room5plus") },
  ];

  return (
    <div className="pt-4">
      <h2 className="text-xl font-bold text-foreground mb-2">
        {t("onboarding.roomCountTitle")}
      </h2>
      <p className="text-sm text-muted mb-6">{t("onboarding.roomCountSubtitle")}</p>

      <div className="flex flex-col gap-3">
        {roomOptions.map((opt) => (
          <OptionCard
            key={opt.value}
            emoji={opt.emoji}
            label={opt.label}
            selected={value === opt.value}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}

function StepResidents({
  value,
  onChange,
  t,
}: {
  value: Set<ResidentType>;
  onChange: (v: Set<ResidentType>) => void;
  t: TFn;
}) {
  const residentOptions: { value: ResidentType; emoji: string; label: string }[] = [
    { value: "couple", emoji: "👫", label: t("onboarding.residentCouple") },
    { value: "kids", emoji: "👶", label: t("onboarding.residentKids") },
    { value: "pets", emoji: "🐱", label: t("onboarding.residentPets") },
    { value: "parents", emoji: "👴", label: t("onboarding.residentParents") },
  ];

  const toggle = (key: ResidentType) => {
    const next = new Set(value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <div className="pt-4">
      <h2 className="text-xl font-bold text-foreground mb-2">
        {t("onboarding.residentsTitle")}
      </h2>
      <p className="text-sm text-muted mb-6">{t("onboarding.residentsSubtitle")}</p>

      <div className="grid grid-cols-2 gap-3">
        {residentOptions.map((opt) => (
          <GridCard
            key={opt.value}
            emoji={opt.emoji}
            label={opt.label}
            selected={value.has(opt.value)}
            onClick={() => toggle(opt.value)}
          />
        ))}
      </div>

      <p className="text-xs text-muted mt-4 text-center">
        {t("onboarding.residentsChooseMany")}
      </p>
    </div>
  );
}

function StepPersonality({
  style,
  onStyleChange,
  minutes,
  onMinutesChange,
  t,
}: {
  style: CleaningStyle;
  onStyleChange: (v: CleaningStyle) => void;
  minutes: DailyMinutes;
  onMinutesChange: (v: DailyMinutes) => void;
  t: TFn;
}) {
  const timeOptions: { value: DailyMinutes; emoji: string; label: string; sublabel: string }[] = [
    { value: 15, emoji: "⚡", label: t("onboarding.time15Label"), sublabel: t("onboarding.time15Sublabel") },
    { value: 30, emoji: "⏰", label: t("onboarding.time30Label"), sublabel: t("onboarding.time30Sublabel") },
    { value: 60, emoji: "💪", label: t("onboarding.time60Label"), sublabel: t("onboarding.time60Sublabel") },
  ];

  return (
    <div className="pt-4">
      <h2 className="text-xl font-bold text-foreground mb-2">
        {t("onboarding.personalityTitle")}
      </h2>
      <p className="text-sm text-muted mb-5">{t("onboarding.personalitySubtitle")}</p>

      <div className="flex flex-col gap-3 mb-6">
        <OptionCard
          emoji="🏃"
          label={t("onboarding.styleSprintLabel")}
          sublabel={t("onboarding.styleSprintSublabel")}
          selected={style === "sprint"}
          onClick={() => onStyleChange("sprint")}
        />
        <OptionCard
          emoji="🧹"
          label={t("onboarding.styleDailyLabel")}
          sublabel={t("onboarding.styleDailySublabel")}
          selected={style === "daily"}
          onClick={() => onStyleChange("daily")}
        />
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-3">
        {t("onboarding.timeQuestion")}
      </h3>

      <div className="flex flex-col gap-2">
        {timeOptions.map((opt) => (
          <OptionCard
            key={opt.value}
            emoji={opt.emoji}
            label={opt.label}
            sublabel={opt.sublabel}
            selected={minutes === opt.value}
            onClick={() => onMinutesChange(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}

function StepGenerating({ t }: { t: TFn }) {
  const messages = [
    t("onboarding.loadingMsg1"),
    t("onboarding.loadingMsg2"),
    t("onboarding.loadingMsg3"),
  ];
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center text-center h-full">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="mb-6"
      >
        <Loader2 className="w-12 h-12 text-primary" />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          className="text-foreground font-medium"
        >
          {messages[msgIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function StepPlanReady({
  tasks,
  homeName,
  t,
}: {
  tasks: TaskTemplate[];
  homeName: string;
  t: TFn;
}) {
  const daily = tasks.filter((task) => task.frequency === "daily");
  const weekly = tasks.filter((task) => task.frequency === "weekly");
  const totalDaily = daily.reduce((s, task) => s + task.estimatedMinutes, 0);

  const planTitle = t("onboarding.planReadyTitle").replace(
    "{homeName}",
    homeName || t("onboarding.planReadyDefaultHome"),
  );
  const taskCountText = t("onboarding.planReadyTaskCount")
    .replace("{count}", String(tasks.length))
    .replace("{minutes}", String(totalDaily));

  return (
    <div className="pt-4">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="text-center mb-4"
      >
        <span className="text-4xl">{t("onboarding.planReadyEmoji")}</span>
      </motion.div>

      <h2 className="text-xl font-bold text-foreground mb-1 text-center">
        {planTitle}
      </h2>
      <p className="text-sm text-muted mb-4 text-center">
        {taskCountText}
      </p>

      <div
        className="overflow-y-auto rounded-2xl border border-border bg-surface divide-y divide-border/40"
        style={{ maxHeight: 220 }}
      >
        {daily.length > 0 && (
          <TaskGroup
            label={t("onboarding.planReadyDailyLabel")}
            count={daily.length}
            tasks={daily}
            color="bg-success/15 text-success"
          />
        )}
        {weekly.length > 0 && (
          <TaskGroup
            label={t("onboarding.planReadyWeeklyLabel")}
            count={weekly.length}
            tasks={weekly}
            color="bg-primary/15 text-primary"
          />
        )}
      </div>

      <p className="text-xs text-muted mt-3 text-center">
        {t("onboarding.canChangeAnytime")}
      </p>
    </div>
  );
}

function TaskGroup({
  label,
  count,
  tasks,
  color,
}: {
  label: string;
  count: number;
  tasks: TaskTemplate[];
  color: string;
}) {
  return (
    <div>
      <div className={`px-3 py-1.5 text-xs font-semibold sticky top-0 bg-surface ${color}`}>
        {label} ({count})
      </div>
      {tasks.map((task, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2 gap-2">
          <span className="text-sm text-foreground flex-1 text-right">{task.title}</span>
          <span className="text-xs text-muted shrink-0">{task.estimatedMinutes} דק&apos;</span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

export function ConversationalOnboarding({ open, onComplete, onSkip }: ConversationalOnboardingProps) {
  const { t } = useTranslation();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(open, onSkip);
  const [step, setStep] = useState(0); // 0 = welcome
  const [homeName, setHomeName] = useState("");
  const [roomCount, setRoomCount] = useState<RoomCount>("3");
  const [residents, setResidents] = useState<Set<ResidentType>>(new Set(["couple"]));
  const [kidCount] = useState(0);
  const [style, setStyle] = useState<CleaningStyle>("daily");
  const [dailyMinutes, setDailyMinutes] = useState<DailyMinutes>(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<TaskTemplate[] | null>(null);

  const goNext = useCallback(() => {
    if (step === 4) {
      // Start generating
      setIsGenerating(true);
      setStep(5);
      // Simulate plan generation with short delay for UX
      setTimeout(() => {
        const tasks = generatePlan(roomCount, residents, style, dailyMinutes);
        setGeneratedTasks(tasks);
        setIsGenerating(false);
      }, 2000);
      return;
    }
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  }, [step, roomCount, residents, style, dailyMinutes]);

  const goBack = useCallback(() => {
    if (step === 5 && !isGenerating) {
      setStep(4);
      setGeneratedTasks(null);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  }, [step, isGenerating]);

  const handleFinish = useCallback(() => {
    if (!generatedTasks) return;
    onComplete({
      homeName,
      roomCount,
      residents,
      kidCount,
      style,
      dailyMinutes,
      tasks: generatedTasks,
    });
  }, [generatedTasks, homeName, roomCount, residents, kidCount, style, dailyMinutes, onComplete]);

  const canProceed = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return true; // name is optional
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return true;
    if (step === 5) return !isGenerating && generatedTasks !== null;
    return false;
  }, [step, isGenerating, generatedTasks]);

  if (!open) return null;

  return (
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.dialogAriaLabel")}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      dir="rtl"
    >
      {/* Header — skip + progress */}
      {step > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between px-5 pt-safe-top pt-4 pb-2"
        >
          <ProgressDots current={step - 1} total={TOTAL_STEPS - 1} />
          <button
            type="button"
            onClick={onSkip}
            aria-label={t("onboarding.skipAriaLabel")}
            className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            {t("common.skip")}
          </button>
        </motion.div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={step === 0 || (step === 5 && isGenerating) ? "h-full flex items-center justify-center" : ""}
          >
            {step === 0 && <StepWelcome onNext={() => setStep(1)} t={t} />}
            {step === 1 && <StepHomeName value={homeName} onChange={setHomeName} t={t} />}
            {step === 2 && <StepRoomCount value={roomCount} onChange={setRoomCount} t={t} />}
            {step === 3 && <StepResidents value={residents} onChange={setResidents} t={t} />}
            {step === 4 && (
              <StepPersonality
                style={style}
                onStyleChange={setStyle}
                minutes={dailyMinutes}
                onMinutesChange={setDailyMinutes}
                t={t}
              />
            )}
            {step === 5 && isGenerating && <StepGenerating t={t} />}
            {step === 5 && !isGenerating && generatedTasks && (
              <StepPlanReady tasks={generatedTasks} homeName={homeName} t={t} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer — navigation buttons */}
      {step > 0 && !(step === 5 && isGenerating) && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-5 pb-safe-bottom pb-6 pt-3 flex items-center gap-3"
        >
          {step > 1 && step !== 5 && (
            <button
              type="button"
              onClick={goBack}
              aria-label={t("onboarding.backAriaLabel")}
              className="px-4 py-2.5 rounded-2xl border border-border text-muted text-sm hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("common.back")}
            </button>
          )}

          {step === 5 && !isGenerating ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!canProceed}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl gradient-primary text-white font-semibold text-sm transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              {t("onboarding.finishButton")}
            </button>
          ) : step > 0 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed}
              aria-label={t("onboarding.continueAriaLabel")}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl gradient-primary text-white font-semibold text-sm transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("onboarding.continueButton")}
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
        </motion.div>
      )}
    </div>
  );
}
