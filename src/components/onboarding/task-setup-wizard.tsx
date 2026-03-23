"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Check, Zap, Clock, Dumbbell } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface TaskTemplate {
  title: string;
  category: "kitchen" | "bathroom" | "living" | "bedroom" | "laundry" | "general" | "outdoor" | "pets" | "kids";
  estimatedMinutes: number;
  recurring: boolean;
  frequency: "daily" | "weekly" | "monthly";
  requiresPets?: boolean;
  requiresKids?: boolean;
  requiresGarden?: boolean;
  requiresCar?: boolean;
}

interface TaskSetupWizardProps {
  open: boolean;
  onComplete: (selectedTasks: TaskTemplate[]) => void;
  onSkip: () => void;
}

type HouseholdFeature = "pets" | "kids" | "garden" | "car";
type RoomKey = "kitchen" | "bathroom" | "living" | "bedroom" | "laundry" | "general";
type TimeLevel = 15 | 30 | 60;

// ────────────────────────────────────────────────────────────────────────────
// Task Templates
// ────────────────────────────────────────────────────────────────────────────

const TASK_TEMPLATES: TaskTemplate[] = [
  // Kitchen — daily
  { title: "שטיפת כלים / הפעלת מדיח", category: "kitchen", estimatedMinutes: 15, recurring: true, frequency: "daily" },
  { title: "ניקוי משטחי עבודה במטבח", category: "kitchen", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  { title: "טאטוא רצפת מטבח", category: "kitchen", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  { title: "הוצאת אשפה", category: "kitchen", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  { title: "סידור שיש המטבח", category: "kitchen", estimatedMinutes: 3, recurring: true, frequency: "daily" },
  // Kitchen — weekly
  { title: "ניקוי עמוק של כיריים", category: "kitchen", estimatedMinutes: 20, recurring: true, frequency: "weekly" },
  { title: "ניקוי מיקרוגל", category: "kitchen", estimatedMinutes: 10, recurring: true, frequency: "weekly" },
  { title: "ניקוי חיצוני של מקרר", category: "kitchen", estimatedMinutes: 10, recurring: true, frequency: "weekly" },
  { title: "ארגון מזווה", category: "kitchen", estimatedMinutes: 15, recurring: true, frequency: "weekly" },

  // Bathroom — daily
  { title: "ניגוב כיור האמבטיה", category: "bathroom", estimatedMinutes: 3, recurring: true, frequency: "daily" },
  // Bathroom — weekly
  { title: "ניקוי שירותים", category: "bathroom", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  { title: "ניקוי מקלחת", category: "bathroom", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  { title: "החלפת מגבות", category: "bathroom", estimatedMinutes: 5, recurring: true, frequency: "weekly" },
  { title: "ניקוי מראות", category: "bathroom", estimatedMinutes: 5, recurring: true, frequency: "weekly" },

  // Living — daily
  { title: "סידור מהיר של הסלון", category: "living", estimatedMinutes: 5, recurring: true, frequency: "daily" },
  { title: "איוורור הבית (פתיחת חלונות)", category: "living", estimatedMinutes: 2, recurring: true, frequency: "daily" },
  // Living — weekly
  { title: "שאיבת אבק בסלון", category: "living", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  { title: "ניגוב אבק ממשטחים", category: "living", estimatedMinutes: 10, recurring: true, frequency: "weekly" },
  { title: "ניקוי רצפות", category: "living", estimatedMinutes: 20, recurring: true, frequency: "weekly" },

  // Bedroom — daily
  { title: "עריכת המיטה", category: "bedroom", estimatedMinutes: 3, recurring: true, frequency: "daily" },
  { title: "איסוף בגדים מלוכלכים לסל", category: "general", estimatedMinutes: 3, recurring: true, frequency: "daily" },
  // Bedroom — weekly
  { title: "שאיבת אבק בחדרי שינה", category: "bedroom", estimatedMinutes: 15, recurring: true, frequency: "weekly" },
  { title: "החלפת מצעים", category: "bedroom", estimatedMinutes: 15, recurring: true, frequency: "weekly" },

  // Laundry
  { title: "הרצת מכונת כביסה", category: "laundry", estimatedMinutes: 5, recurring: true, frequency: "weekly" },
  { title: "תליית / ייבוש כביסה", category: "laundry", estimatedMinutes: 10, recurring: true, frequency: "weekly" },
  { title: "קיפול וסידור כביסה", category: "laundry", estimatedMinutes: 15, recurring: true, frequency: "weekly" },

  // General
  { title: "ארגון וסידור כללי", category: "general", estimatedMinutes: 10, recurring: true, frequency: "weekly" },
  { title: "ניקוי ידיות דלתות ומתגי אור", category: "general", estimatedMinutes: 5, recurring: true, frequency: "weekly" },
  { title: "מחיקת אצבעות מזכוכיות", category: "general", estimatedMinutes: 5, recurring: true, frequency: "weekly" },

  // Pets
  { title: "האכלת חיות מחמד (בוקר)", category: "pets", estimatedMinutes: 5, recurring: true, frequency: "daily", requiresPets: true },
  { title: "האכלת חיות מחמד (ערב)", category: "pets", estimatedMinutes: 5, recurring: true, frequency: "daily", requiresPets: true },
  { title: "מים טריים לחיות מחמד", category: "pets", estimatedMinutes: 2, recurring: true, frequency: "daily", requiresPets: true },
  { title: "ניקוי ארגז חול / כלוב", category: "pets", estimatedMinutes: 5, recurring: true, frequency: "daily", requiresPets: true },
  { title: "הוצאת כלב לטיול", category: "pets", estimatedMinutes: 20, recurring: true, frequency: "daily", requiresPets: true },

  // Kids
  { title: "סידור צעצועים", category: "kids", estimatedMinutes: 10, recurring: true, frequency: "daily", requiresKids: true },
  { title: "הכנת תיק ספר", category: "kids", estimatedMinutes: 5, recurring: true, frequency: "daily", requiresKids: true },
  { title: "ניקוי חדר ילדים", category: "kids", estimatedMinutes: 15, recurring: true, frequency: "weekly", requiresKids: true },
  { title: "כביסת בגדי ילדים", category: "kids", estimatedMinutes: 10, recurring: true, frequency: "weekly", requiresKids: true },

  // Garden/Balcony
  { title: "השקיית צמחים", category: "outdoor", estimatedMinutes: 10, recurring: true, frequency: "daily", requiresGarden: true },
  { title: "ניקוי מרפסת / גינה", category: "outdoor", estimatedMinutes: 20, recurring: true, frequency: "weekly", requiresGarden: true },
  { title: "גיזום ועדור", category: "outdoor", estimatedMinutes: 30, recurring: true, frequency: "monthly", requiresGarden: true },

  // Car
  { title: "בדיקת רמת שמן / מים", category: "general", estimatedMinutes: 5, recurring: true, frequency: "monthly", requiresCar: true },
  { title: "שטיפת רכב", category: "general", estimatedMinutes: 30, recurring: true, frequency: "monthly", requiresCar: true },
];

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const HOUSEHOLD_FEATURES: { key: HouseholdFeature; emoji: string; label: string }[] = [
  { key: "pets", emoji: "🐱", label: "חיות מחמד" },
  { key: "kids", emoji: "👶", label: "ילדים" },
  { key: "garden", emoji: "🌿", label: "גינה / מרפסת" },
  { key: "car", emoji: "🚗", label: "רכב" },
];

const ROOMS: { key: RoomKey; emoji: string; label: string }[] = [
  { key: "kitchen", emoji: "🍽️", label: "מטבח" },
  { key: "bathroom", emoji: "🚿", label: "אמבטיה" },
  { key: "living", emoji: "🛋️", label: "סלון" },
  { key: "bedroom", emoji: "🛏️", label: "חדר שינה" },
  { key: "laundry", emoji: "👕", label: "כביסה" },
  { key: "general", emoji: "🔧", label: "כללי" },
];

const TIME_OPTIONS: { minutes: TimeLevel; emoji: string; label: string; sublabel: string }[] = [
  { minutes: 15, emoji: "⚡", label: "15 דקות", sublabel: "מינימום" },
  { minutes: 30, emoji: "⏰", label: "30 דקות", sublabel: "מומלץ" },
  { minutes: 60, emoji: "💪", label: "60 דקות", sublabel: "מקסימום" },
];

const ROOM_CATEGORY_MAP: Record<RoomKey, TaskTemplate["category"][]> = {
  kitchen: ["kitchen"],
  bathroom: ["bathroom"],
  living: ["living"],
  bedroom: ["bedroom"],
  laundry: ["laundry"],
  general: ["general", "outdoor", "pets", "kids"],
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function filterTasks(
  features: Set<HouseholdFeature>,
  rooms: Set<RoomKey>,
  dailyMinutes: TimeLevel,
): TaskTemplate[] {
  // Determine which categories are relevant
  const allowedCategories = new Set<TaskTemplate["category"]>();
  for (const room of rooms) {
    for (const cat of ROOM_CATEGORY_MAP[room]) {
      allowedCategories.add(cat);
    }
  }

  // Always allow general
  allowedCategories.add("general");

  const filtered = TASK_TEMPLATES.filter((t) => {
    // Skip pet tasks if no pets
    if (t.requiresPets && !features.has("pets")) return false;
    // Skip kids tasks if no kids
    if (t.requiresKids && !features.has("kids")) return false;
    // Skip garden tasks if no garden
    if (t.requiresGarden && !features.has("garden")) return false;
    // Skip car tasks if no car
    if (t.requiresCar && !features.has("car")) return false;

    // Category must be in allowed rooms
    if (!allowedCategories.has(t.category)) return false;

    return true;
  });

  // Sort by frequency priority then estimatedMinutes
  const freqOrder: Record<string, number> = { daily: 0, weekly: 1, monthly: 2 };
  const sorted = [...filtered].sort((a, b) => freqOrder[a.frequency] - freqOrder[b.frequency] || a.estimatedMinutes - b.estimatedMinutes);

  // Limit based on daily minute budget
  // daily tasks take priority; pick enough to fill the budget
  const dailyTasks = sorted.filter((t) => t.frequency === "daily");
  const weeklyTasks = sorted.filter((t) => t.frequency === "weekly");
  const monthlyTasks = sorted.filter((t) => t.frequency === "monthly");

  let budget = dailyMinutes;
  const selected: TaskTemplate[] = [];

  // Fill with daily tasks up to budget
  for (const t of dailyTasks) {
    if (budget <= 0) break;
    selected.push(t);
    budget -= t.estimatedMinutes;
  }

  // Always include core weekly + monthly (they don't happen every day)
  const weeklyBudget = dailyMinutes >= 30 ? 8 : 5;
  for (const t of weeklyTasks.slice(0, weeklyBudget)) {
    selected.push(t);
  }

  const monthlyBudget = dailyMinutes >= 30 ? 4 : 2;
  for (const t of monthlyTasks.slice(0, monthlyBudget)) {
    selected.push(t);
  }

  return selected;
}

// ────────────────────────────────────────────────────────────────────────────
// Step components
// ────────────────────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center" dir="rtl">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current - 1
              ? "w-6 bg-primary"
              : i < current - 1
              ? "w-2 bg-primary/40"
              : "w-2 bg-border"
          }`}
        />
      ))}
      <span className="text-xs text-muted mr-2">
        {current}/{total}
      </span>
    </div>
  );
}

function ToggleCard({
  emoji,
  label,
  selected,
  onToggle,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 select-none cursor-pointer ${
        selected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-surface hover:border-primary/40 hover:bg-surface-hover"
      }`}
    >
      {selected && (
        <span className="absolute top-2 left-2 bg-primary rounded-full p-0.5">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}
      <span className="text-3xl">{emoji}</span>
      <span className={`text-sm font-medium text-center leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
        {label}
      </span>
    </button>
  );
}

function TimeCard({
  emoji,
  label,
  sublabel,
  selected,
  onSelect,
}: {
  emoji: string;
  label: string;
  sublabel: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 w-full p-4 rounded-2xl border-2 transition-all duration-200 text-right ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-surface hover:border-primary/40 hover:bg-surface-hover"
      }`}
    >
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1 text-right">
        <p className={`font-semibold ${selected ? "text-primary" : "text-foreground"}`}>{label}</p>
        <p className="text-xs text-muted">{sublabel}</p>
      </div>
      {selected && (
        <span className="bg-primary rounded-full p-0.5 shrink-0">
          <Check className="w-3.5 h-3.5 text-white" />
        </span>
      )}
    </button>
  );
}

const FREQ_LABEL: Record<string, string> = {
  daily: "יומי",
  weekly: "שבועי",
  monthly: "חודשי",
};

const FREQ_COLOR: Record<string, string> = {
  daily: "bg-success/15 text-success",
  weekly: "bg-primary/15 text-primary",
  monthly: "bg-accent/15 text-accent",
};

// ────────────────────────────────────────────────────────────────────────────
// Main Wizard
// ────────────────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export function TaskSetupWizard({ open, onComplete, onSkip }: TaskSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [features, setFeatures] = useState<Set<HouseholdFeature>>(new Set());
  const [rooms, setRooms] = useState<Set<RoomKey>>(
    new Set<RoomKey>(["kitchen", "bathroom", "living", "bedroom", "laundry", "general"])
  );
  const [dailyMinutes, setDailyMinutes] = useState<TimeLevel>(30);

  const TOTAL_STEPS = 4;

  const filteredTasks = useMemo(
    () => filterTasks(features, rooms, dailyMinutes),
    [features, rooms, dailyMinutes]
  );

  function toggleFeature(key: HouseholdFeature) {
    setFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleRoom(key: RoomKey) {
    setRooms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function goNext() {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      onComplete(filteredTasks);
    }
  }

  function goBack() {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative z-10 w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <StepIndicator current={step} total={TOTAL_STEPS} />
          <button
            type="button"
            onClick={onSkip}
            className="p-1.5 rounded-xl hover:bg-surface-hover text-muted transition-colors"
            aria-label="דלג"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step content */}
        <div className="overflow-hidden px-5 pb-4" style={{ minHeight: 340 }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {step === 1 && (
                <Step1Features features={features} onToggle={toggleFeature} />
              )}
              {step === 2 && (
                <Step2Rooms rooms={rooms} onToggle={toggleRoom} />
              )}
              {step === 3 && (
                <Step3Time value={dailyMinutes} onChange={setDailyMinutes} />
              )}
              {step === 4 && (
                <Step4Preview tasks={filteredTasks} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-2 flex items-center gap-3 border-t border-border/60">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 px-4 py-2.5 rounded-2xl border border-border text-muted hover:bg-surface-hover transition-colors text-sm font-medium"
            >
              <ChevronRight className="w-4 h-4" />
              חזרה
            </button>
          ) : (
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2.5 rounded-2xl text-muted text-sm hover:bg-surface-hover transition-colors"
            >
              דלג
            </button>
          )}

          <button
            type="button"
            onClick={goNext}
            disabled={step === 2 && rooms.size === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl gradient-primary text-white font-semibold text-sm transition-opacity disabled:opacity-50"
          >
            {step === TOTAL_STEPS ? (
              <>
                <Check className="w-4 h-4" />
                התחלה!
              </>
            ) : (
              <>
                המשך
                <ChevronLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 1: Household features
// ────────────────────────────────────────────────────────────────────────────

function Step1Features({
  features,
  onToggle,
}: {
  features: Set<HouseholdFeature>;
  onToggle: (k: HouseholdFeature) => void;
}) {
  return (
    <div className="pt-2">
      <h2 className="text-xl font-bold text-foreground mb-1">מה יש אצלכם בבית?</h2>
      <p className="text-sm text-muted mb-5">בחרו את מה שרלוונטי — נתאים את המטלות בהתאם</p>
      <div className="grid grid-cols-2 gap-3">
        {HOUSEHOLD_FEATURES.map((f) => (
          <ToggleCard
            key={f.key}
            emoji={f.emoji}
            label={f.label}
            selected={features.has(f.key)}
            onToggle={() => onToggle(f.key)}
          />
        ))}
      </div>
      <p className="text-xs text-muted mt-4 text-center">אפשר לא לבחור כלום ולעבור הלאה</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 2: Rooms
// ────────────────────────────────────────────────────────────────────────────

function Step2Rooms({
  rooms,
  onToggle,
}: {
  rooms: Set<RoomKey>;
  onToggle: (k: RoomKey) => void;
}) {
  return (
    <div className="pt-2">
      <h2 className="text-xl font-bold text-foreground mb-1">באילו חדרים תרצו להתמקד?</h2>
      <p className="text-sm text-muted mb-5">בטלו את החדרים שאינם רלוונטיים לביתכם</p>
      <div className="grid grid-cols-3 gap-3">
        {ROOMS.map((r) => (
          <ToggleCard
            key={r.key}
            emoji={r.emoji}
            label={r.label}
            selected={rooms.has(r.key)}
            onToggle={() => onToggle(r.key)}
          />
        ))}
      </div>
      {rooms.size === 0 && (
        <p className="text-xs text-danger mt-3 text-center">יש לבחור לפחות חדר אחד</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 3: Time budget
// ────────────────────────────────────────────────────────────────────────────

function Step3Time({
  value,
  onChange,
}: {
  value: TimeLevel;
  onChange: (v: TimeLevel) => void;
}) {
  return (
    <div className="pt-2">
      <h2 className="text-xl font-bold text-foreground mb-1">כמה זמן יש לכם ביום?</h2>
      <p className="text-sm text-muted mb-5">נבחר כמות מטלות שמתאימה לקצב שלכם</p>
      <div className="flex flex-col gap-3">
        {TIME_OPTIONS.map((t) => (
          <TimeCard
            key={t.minutes}
            emoji={t.emoji}
            label={t.label}
            sublabel={t.sublabel}
            selected={value === t.minutes}
            onSelect={() => onChange(t.minutes)}
          />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 4: Preview
// ────────────────────────────────────────────────────────────────────────────

function Step4Preview({ tasks }: { tasks: TaskTemplate[] }) {
  const daily = tasks.filter((t) => t.frequency === "daily");
  const weekly = tasks.filter((t) => t.frequency === "weekly");
  const monthly = tasks.filter((t) => t.frequency === "monthly");

  const totalDaily = daily.reduce((s, t) => s + t.estimatedMinutes, 0);

  return (
    <div className="pt-2">
      <h2 className="text-xl font-bold text-foreground mb-1">המטלות שלכם מוכנות!</h2>
      <p className="text-sm text-muted mb-1">
        {tasks.length} מטלות • ~{totalDaily} דק' ביום
      </p>

      <div
        className="mt-3 overflow-y-auto rounded-2xl border border-border/60 bg-surface divide-y divide-border/40"
        style={{ maxHeight: 260 }}
      >
        {daily.length > 0 && (
          <TaskGroup label="יומי" tasks={daily} freq="daily" />
        )}
        {weekly.length > 0 && (
          <TaskGroup label="שבועי" tasks={weekly} freq="weekly" />
        )}
        {monthly.length > 0 && (
          <TaskGroup label="חודשי" tasks={monthly} freq="monthly" />
        )}
      </div>

      <p className="text-xs text-muted mt-3 text-center">
        ניתן לשנות ולהוסיף מטלות בכל עת מתוך האפליקציה
      </p>
    </div>
  );
}

function TaskGroup({
  label,
  tasks,
  freq,
}: {
  label: string;
  tasks: TaskTemplate[];
  freq: string;
}) {
  return (
    <div>
      <div className={`px-3 py-1.5 text-xs font-semibold sticky top-0 bg-surface ${FREQ_COLOR[freq]}`}>
        {label} ({tasks.length})
      </div>
      {tasks.map((t, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-3 py-2 gap-2 hover:bg-surface-hover transition-colors"
        >
          <span className="text-sm text-foreground flex-1 text-right">{t.title}</span>
          <span className="text-xs text-muted shrink-0">{t.estimatedMinutes} דק'</span>
        </div>
      ))}
    </div>
  );
}
