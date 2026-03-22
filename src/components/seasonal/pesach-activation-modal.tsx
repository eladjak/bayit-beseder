"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, ShoppingCart, Check, Loader2 } from "lucide-react";
import type { SeasonalTemplate } from "@/lib/seasonal/types";
import type { SeasonalActivation } from "@/lib/seasonal/types";
import { getDaysUntilHoliday } from "@/lib/seasonal/registry";

type ModalStep = "overview" | "creating" | "shopping" | "done";

interface PesachActivationModalProps {
  isOpen: boolean;
  template: SeasonalTemplate;
  activation: SeasonalActivation | null;
  members: string[];
  householdId: string | null;
  userId: string | null;
  onClose: () => void;
  onActivate: (startDate: Date) => void;
  onCreateTasks: (members: string[]) => Promise<{ created: number; errors: string[] }>;
  onAddShopping: (householdId: string, userId: string) => Promise<{ added: number; errors: string[] }>;
  onDeactivate: () => Promise<void>;
}

export function PesachActivationModal({
  isOpen,
  template,
  activation,
  members,
  householdId,
  userId,
  onClose,
  onActivate,
  onCreateTasks,
  onAddShopping,
  onDeactivate,
}: PesachActivationModalProps) {
  const [step, setStep] = useState<ModalStep>(activation?.tasksCreated ? "done" : "overview");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [createResult, setCreateResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [shoppingResult, setShoppingResult] = useState<{ added: number; errors: string[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const daysUntil = useMemo(() => getDaysUntilHoliday(template), [template]);
  const holidayDateStr = useMemo(() => {
    const d = template.getHolidayDate(new Date().getFullYear());
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  }, [template]);

  async function handleStartCreation() {
    if (!activation) {
      onActivate(new Date(startDate));
    }

    setStep("creating");
    setIsProcessing(true);

    const result = await onCreateTasks(members);
    setCreateResult(result);
    setIsProcessing(false);
    setStep("shopping");
  }

  async function handleAddShopping() {
    if (!householdId || !userId) return;
    setIsProcessing(true);
    const result = await onAddShopping(householdId, userId);
    setShoppingResult(result);
    setIsProcessing(false);
    setStep("done");
  }

  function handleSkipShopping() {
    setStep("done");
  }

  async function handleDeactivate() {
    setDeactivating(true);
    await onDeactivate();
    setDeactivating(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl max-w-lg mx-auto max-h-[85dvh] overflow-y-auto"
            dir="rtl"
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 rounded-t-2xl px-4 pt-4 pb-3 text-white"
              style={{ background: `linear-gradient(135deg, ${template.gradientColors[0]}, ${template.gradientColors[1]})` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{template.emoji} {template.nameHe}</h2>
                  <p className="text-xs opacity-80 mt-0.5">{holidayDateStr} — {daysUntil} ימים</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="סגירה"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* ===== Step: Overview ===== */}
              {step === "overview" && !activation?.tasksCreated && (
                <>
                  <p className="text-sm text-muted">{template.description}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="card-elevated p-3 text-center">
                      <div className="text-2xl font-bold text-foreground">{template.tasks.length}</div>
                      <div className="text-xs text-muted">משימות ניקיון</div>
                    </div>
                    <div className="card-elevated p-3 text-center">
                      <div className="text-2xl font-bold text-foreground">{template.shopping.length}</div>
                      <div className="text-xs text-muted">פריטי קניות</div>
                    </div>
                  </div>

                  {/* Date picker */}
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      <Calendar className="w-4 h-4 inline-block ml-1" />
                      תאריך התחלה
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    <p className="text-xs text-muted mt-1">
                      המשימות יתוזמנו מתאריך זה עד ליל הסדר
                    </p>
                  </div>

                  {/* Phase breakdown */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">שלבי ההכנה:</h3>
                    {[
                      { phase: 1, label: "ניקוי כללי עמוק", days: "18-12 ימים לפני" },
                      { phase: 2, label: "חדר אחרי חדר + מכשירים", days: "11-5 ימים לפני" },
                      { phase: 3, label: "מטבח אינטנסיבי + הכשרה", days: "4-2 ימים לפני" },
                      { phase: 4, label: "בדיקת חמץ, בישולים, שולחן סדר", days: "יום לפני" },
                    ].map((p) => (
                      <div key={p.phase} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                          style={{ background: `linear-gradient(135deg, ${template.gradientColors[0]}, ${template.gradientColors[1]})` }}
                        >
                          {p.phase}
                        </span>
                        <span className="flex-1 text-foreground font-medium">{p.label}</span>
                        <span className="text-muted">{p.days}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleStartCreation}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${template.gradientColors[0]}, ${template.gradientColors[1]})` }}
                  >
                    {template.emoji} הפעלת מצב פסח
                  </button>
                </>
              )}

              {/* ===== Step: Creating tasks ===== */}
              {step === "creating" && (
                <div className="text-center py-8">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-3" />
                  <p className="font-semibold text-foreground">יוצר משימות...</p>
                  <p className="text-sm text-muted mt-1">מתזמן {template.tasks.length} משימות לפי שלבים</p>
                </div>
              )}

              {/* ===== Step: Shopping ===== */}
              {step === "shopping" && (
                <>
                  {createResult && (
                    <div className="card-elevated p-3 text-center">
                      <Check className="w-8 h-8 text-green-500 mx-auto mb-1" />
                      <p className="font-semibold text-foreground">
                        {createResult.created} משימות נוצרו בהצלחה!
                      </p>
                      {createResult.errors.length > 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          {createResult.errors.length} שגיאות
                        </p>
                      )}
                    </div>
                  )}

                  <div className="card-elevated p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">רשימת קניות לפסח</h3>
                    </div>
                    <p className="text-sm text-muted mb-3">
                      {template.shopping.length} פריטים — מצות, יין, ירקות, בשר ועוד
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddShopping}
                        disabled={isProcessing || !householdId}
                        className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm disabled:opacity-40 transition-opacity"
                        style={{ background: `linear-gradient(135deg, ${template.gradientColors[0]}, ${template.gradientColors[1]})` }}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          "הוסף לרשימת קניות"
                        )}
                      </button>
                      <button
                        onClick={handleSkipShopping}
                        className="px-4 py-2.5 rounded-xl border border-border text-muted text-sm font-medium hover:bg-surface-hover transition-colors"
                      >
                        דלג
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ===== Step: Done ===== */}
              {step === "done" && (
                <>
                  <div className="text-center py-4">
                    <div className="text-4xl mb-2">🫓✨</div>
                    <h3 className="font-bold text-lg text-foreground">מצב פסח הופעל!</h3>
                    <p className="text-sm text-muted mt-1">
                      המשימות מופיעות בלוח השבועי לפי תאריכים
                    </p>
                  </div>

                  {shoppingResult && shoppingResult.added > 0 && (
                    <div className="card-elevated p-3 text-center text-sm">
                      <ShoppingCart className="w-5 h-5 text-green-500 mx-auto mb-1" />
                      {shoppingResult.added} פריטים נוספו לרשימת הקניות
                    </div>
                  )}

                  {/* Deactivate option */}
                  {activation?.tasksCreated && (
                    <button
                      onClick={handleDeactivate}
                      disabled={deactivating}
                      className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      {deactivating ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        "ביטול מצב פסח (סיום כל המשימות)"
                      )}
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm"
                    style={{ background: `linear-gradient(135deg, ${template.gradientColors[0]}, ${template.gradientColors[1]})` }}
                  >
                    סגירה
                  </button>
                </>
              )}
            </div>

            {/* Safe area padding */}
            <div className="h-6" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
