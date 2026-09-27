"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ChevronDown, ChevronUp, Plus, Snowflake, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useMealPlanner, type SwapAlternative } from "@/hooks/useMealPlanner";
import { ilDateString } from "@/lib/meals/timezone";
import { toHebrewShortDate, forHebrewDayLabel } from "@/lib/meals/format";
import { haptic } from "@/lib/haptics";

const STATUS_LABEL: Record<string, string> = {
  planned: "מתוכנן",
  prepped: "הוכן",
  cooked: "בושל",
  skipped: "דילגנו",
  leftovers: "שאריות",
};

function DefrostBanner({
  items,
}: {
  items: { date: string; mealName: string; startNow: boolean; hoursUntilStart: number; prepNote: string | null }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2" role="status">
      <div className="flex items-center gap-2 font-bold text-amber-800">
        <Snowflake className="w-5 h-5" aria-hidden="true" />
        מה להפשיר הערב
      </div>
      {items.map((item, i) => (
        <div key={i} className="text-sm text-amber-900">
          {item.startNow ? "🔴 עכשיו: " : `🕐 עוד כ-${Math.max(0, Math.round(item.hoursUntilStart))} שעות: `}
          {item.prepNote ?? `${item.mealName} מהמקפיא`} — הארוחה מתוכננת {forHebrewDayLabel(item.date)} ({item.mealName})
        </div>
      ))}
    </div>
  );
}

function DayCard({
  date,
  dayName,
  mealName,
  status,
  isToday,
  onSwap,
  onCooked,
  onSkipped,
  onLeftovers,
}: {
  date: string;
  dayName: string;
  mealName: string | null;
  status: string;
  isToday: boolean;
  onSwap: () => void;
  onCooked: () => void;
  onSkipped: () => void;
  onLeftovers: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 space-y-2 ${
        isToday ? "border-primary bg-primary/[0.04]" : "border-border"
      }`}
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-bold">{dayName}</div>
          {isToday && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
              היום
            </span>
          )}
        </div>
        <div className="text-xs text-muted">{toHebrewShortDate(date)}</div>
      </div>
      <div className="text-base">{mealName ?? "אין ארוחה מתוכננת"}</div>
      <div className="text-xs text-muted">{STATUS_LABEL[status] ?? status}</div>
      {isToday && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={onSwap}
            className="px-3 py-1.5 rounded-xl border border-border text-sm active:scale-[0.96] transition-transform"
          >
            החלפה מהירה
          </button>
          <button
            type="button"
            onClick={onCooked}
            className="px-3 py-1.5 rounded-xl bg-primary text-white text-sm active:scale-[0.96] transition-transform"
          >
            בושל ✅
          </button>
          <button
            type="button"
            onClick={onLeftovers}
            className="px-3 py-1.5 rounded-xl border border-border text-sm active:scale-[0.96] transition-transform"
          >
            שאריות
          </button>
          <button
            type="button"
            onClick={onSkipped}
            className="px-3 py-1.5 rounded-xl border border-border text-sm text-muted active:scale-[0.96] transition-transform"
          >
            דילוג
          </button>
        </div>
      )}
    </div>
  );
}

function AddMealForm({
  onAdd,
  onClose,
}: {
  onAdd: (meal: {
    name: string;
    whoEats: string[];
    prepLeadHours: number;
    prepNote: string | null;
    tags: string[];
    ingredients: Array<{ name: string }>;
  }) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [prepLeadHours, setPrepLeadHours] = useState(0);
  const [saving, setSaving] = useState(false);

  return (
    <form
      dir="rtl"
      className="rounded-2xl border border-border p-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        const ok = await onAdd({
          name: name.trim(),
          whoEats: [],
          prepLeadHours,
          prepNote: null,
          tags: [],
          ingredients: [],
        });
        setSaving(false);
        if (ok) {
          toast.success("הארוחה נוספה לסבב");
          onClose();
        } else {
          toast.error("לא הצלחנו להוסיף את הארוחה");
        }
      }}
    >
      <div className="font-bold">הוספת ארוחה משלכם</div>
      <label className="block text-sm" htmlFor="meal-name">
        שם הארוחה
      </label>
      <input
        id="meal-name"
        className="w-full rounded-xl border border-border px-3 py-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <label className="block text-sm" htmlFor="meal-prep">
        שעות הכנה מראש (0 אם אין צורך בהפשרה)
      </label>
      <input
        id="meal-prep"
        type="number"
        min={0}
        max={72}
        className="w-full rounded-xl border border-border px-3 py-2"
        value={prepLeadHours}
        onChange={(e) => setPrepLeadHours(Number(e.target.value))}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm disabled:opacity-50"
        >
          {saving ? "שומר..." : "הוספה"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm">
          ביטול
        </button>
      </div>
    </form>
  );
}

export default function MealsPage() {
  const {
    loading,
    error,
    week,
    tonightPrep,
    regenerateWeek,
    swapDay,
    markDay,
    fetchAlternatives,
    addMeal,
  } = useMealPlanner();

  const [showAddForm, setShowAddForm] = useState(false);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<SwapAlternative[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { title: string; quantity?: number; unit?: string; forMeals: string[] }[]
  >([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const today = ilDateString(new Date());

  async function openSwap(date: string) {
    haptic("tap");
    const alts = await fetchAlternatives(date);
    setAlternatives(alts);
    setSwapTarget(date);
  }

  async function openShoppingSuggest() {
    setSuggestLoading(true);
    setSuggestOpen(true);
    try {
      const res = await fetch("/api/meals/shopping-suggest");
      const body = await res.json();
      setSuggestions(body.suggestions ?? []);
    } finally {
      setSuggestLoading(false);
    }
  }

  async function confirmSuggestions() {
    if (suggestions.length === 0) return;
    const res = await fetch("/api/meals/shopping-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: suggestions.map((s) => ({ title: s.title, quantity: s.quantity, unit: s.unit })) }),
    });
    if (res.ok) {
      toast.success("נוסף לרשימת הקניות");
      setSuggestOpen(false);
      setSuggestions([]);
    } else {
      toast.error("לא הצלחנו להוסיף לרשימה");
    }
  }

  return (
    <div className="space-y-4 pb-28 px-4 pt-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">מתכנן הארוחות</h1>
        <button
          type="button"
          onClick={() => void regenerateWeek()}
          aria-label="חשב תוכנית חדשה לשבוע"
          className="p-2 rounded-xl border border-border active:scale-[0.9] transition-transform"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm" role="alert">
          {error}
        </div>
      )}

      <DefrostBanner items={tonightPrep} />

      <button
        type="button"
        onClick={() => void openShoppingSuggest()}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-medium active:scale-[0.98] transition-transform"
      >
        <ShoppingCart className="w-4 h-4" aria-hidden="true" />
        הוסף מצרכים לרשימה
      </button>

      {loading && !week && <div className="text-center text-muted py-8">טוען...</div>}

      {week && (
        <div className="space-y-3">
          {week.days.map((day) => (
            <DayCard
              key={day.date}
              date={day.date}
              dayName={day.dayName}
              mealName={day.mealName}
              status={day.status}
              isToday={day.date === today}
              onSwap={() => void openSwap(day.date)}
              onCooked={() => void markDay(day.date, "cooked")}
              onSkipped={() => void markDay(day.date, "skipped")}
              onLeftovers={() => void markDay(day.date, "leftovers")}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAddForm((v) => !v)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm text-muted active:scale-[0.98] transition-transform"
      >
        {showAddForm ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
        הוסיפו ארוחה משלכם
      </button>

      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <AddMealForm
              onAdd={addMeal}
              onClose={() => setShowAddForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap sheet */}
      {swapTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="החלפת ארוחה"
          onClick={() => setSwapTarget(null)}
        >
          <div
            className="bg-background rounded-t-2xl w-full max-w-lg p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold">בחרו ארוחה חלופית</div>
            {alternatives.length === 0 && <div className="text-sm text-muted">אין חלופות זמינות כרגע.</div>}
            {alternatives.map((alt) => (
              <button
                key={alt.id}
                type="button"
                className="w-full text-right px-3 py-2 rounded-xl border border-border active:scale-[0.98] transition-transform"
                onClick={async () => {
                  await swapDay(swapTarget, alt.id);
                  setSwapTarget(null);
                  toast.success(`הוחלף ל${alt.name}`);
                }}
              >
                {alt.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSwapTarget(null)}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm text-muted"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Shopping suggestions sheet */}
      {suggestOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="הצעות לרשימת קניות"
          onClick={() => setSuggestOpen(false)}
        >
          <div className="bg-background rounded-t-2xl w-full max-w-lg p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold">מצרכים מוצעים לשבוע</div>
            {suggestLoading && <div className="text-sm text-muted">טוען...</div>}
            {!suggestLoading && suggestions.length === 0 && (
              <div className="text-sm text-muted">כל המצרכים לשבוע כבר ברשימה שלכם 🎉</div>
            )}
            {!suggestLoading && suggestions.length > 0 && (
              <>
                <ul className="space-y-1">
                  {suggestions.map((s) => (
                    <li key={s.title} className="text-sm">
                      {s.title}
                      {s.quantity ? ` — ${s.quantity}${s.unit ?? ""}` : ""}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void confirmSuggestions()}
                  className="w-full px-3 py-2 rounded-xl bg-primary text-white text-sm"
                >
                  הוספה לרשימת הקניות
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSuggestOpen(false)}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm text-muted"
            >
              סגירה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
