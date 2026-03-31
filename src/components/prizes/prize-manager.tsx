"use client";

import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { Prize } from "./prize-card";

const STORAGE_KEY = "bayit-prizes";

const DEFAULT_PRIZES: Prize[] = [
  { id: "1", name: "גלידה לכולם", emoji: "🍦", threshold: 50, unlocked: false },
  { id: "2", name: "ערב סרט משפחתי", emoji: "🎬", threshold: 100, unlocked: false },
  { id: "3", name: "ארוחת מסעדה", emoji: "🍽️", threshold: 200, unlocked: false },
  { id: "4", name: "טיול משפחתי", emoji: "🏖️", threshold: 500, unlocked: false },
];

const EMOJI_GRID = [
  "🍦", "🎬", "🍽️", "🏖️", "🎁", "🎉", "🎮", "🏆",
  "🍕", "🍰", "☕", "🍷", "🎭", "🎵", "🏋️", "🧘",
  "🚗", "✈️", "🏕️", "🌅", "🎨", "📚", "🎯", "💆",
  "🛍️", "🎠", "🌈", "🦋", "🌺", "⭐", "🥳", "🥇",
];

function loadPrizes(): Prize[] {
  if (typeof window === "undefined") return DEFAULT_PRIZES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRIZES;
    const parsed = JSON.parse(raw) as Prize[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRIZES;
  } catch {
    return DEFAULT_PRIZES;
  }
}

function savePrizes(prizes: Prize[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prizes));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

function generateId(): string {
  return `prize-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface AddPrizeFormProps {
  onAdd: (prize: Prize) => void;
  onCancel: () => void;
}

function AddPrizeForm({ onAdd, onCancel }: AddPrizeFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎁");
  const [threshold, setThreshold] = useState<number | "">(100);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const nameId = useId();
  const thresholdId = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const numThreshold = Number(threshold);
    if (!trimmedName || !numThreshold || numThreshold <= 0) return;
    onAdd({
      id: generateId(),
      name: trimmedName,
      emoji,
      threshold: numThreshold,
      unlocked: false,
    });
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="border border-primary/30 rounded-xl p-4 space-y-3 bg-primary/5"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Emoji picker */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted">אמוג&#39;י</p>
        <button
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-surface text-sm hover:bg-surface-hover transition-colors"
        >
          <span className="text-xl">{emoji}</span>
          {showEmojiPicker ? (
            <ChevronUp className="w-3 h-3 text-muted" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted" />
          )}
        </button>

        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              className="grid grid-cols-8 gap-1 p-2 border border-border rounded-xl bg-surface shadow-sm"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {EMOJI_GRID.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setEmoji(e);
                    setShowEmojiPicker(false);
                  }}
                  className={`text-xl p-1 rounded-lg transition-colors hover:bg-surface-hover ${
                    emoji === e ? "bg-primary/10 ring-1 ring-primary/40" : ""
                  }`}
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Name input */}
      <div className="space-y-1">
        <label htmlFor={nameId} className="text-xs font-medium text-muted">
          {t("prizes.prizeName")}
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("prizes.prizeName")}
          maxLength={60}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          required
        />
      </div>

      {/* Threshold input */}
      <div className="space-y-1">
        <label htmlFor={thresholdId} className="text-xs font-medium text-muted">
          {t("prizes.prizePoints")}
        </label>
        <input
          id={thresholdId}
          type="number"
          min={1}
          max={99999}
          value={threshold}
          onChange={(e) =>
            setThreshold(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          required
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!name.trim() || !threshold || Number(threshold) <= 0}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40 active:scale-[0.97]"
        >
          {t("prizes.addPrize")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover active:scale-[0.97]"
        >
          ביטול
        </button>
      </div>
    </motion.form>
  );
}

const listItemVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: "easeOut" as const },
  }),
  exit: { opacity: 0, x: -12, transition: { duration: 0.2 } },
};

export function PrizeManager() {
  const { t } = useTranslation();
  const [prizes, setPrizes] = useState<Prize[]>(DEFAULT_PRIZES);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setPrizes(loadPrizes());
  }, []);

  function handleAdd(prize: Prize) {
    const updated = [...prizes, prize].sort((a, b) => a.threshold - b.threshold);
    setPrizes(updated);
    savePrizes(updated);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const updated = prizes.filter((p) => p.id !== id);
    setPrizes(updated);
    savePrizes(updated);
  }

  return (
    <div className="space-y-4">
      {/* Prize list */}
      <ul className="space-y-2" aria-label={t("prizes.title")}>
        <AnimatePresence initial={false}>
          {prizes
            .sort((a, b) => a.threshold - b.threshold)
            .map((prize, i) => (
              <motion.li
                key={prize.id}
                variants={listItemVariants}
                custom={i}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
              >
                <span className="text-2xl shrink-0">{prize.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {prize.name}
                  </p>
                  <p className="text-xs text-muted">
                    {prize.threshold} {t("prizes.prizePoints").toLowerCase()}
                  </p>
                </div>
                {prize.unlocked && (
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">
                    ✓
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(prize.id)}
                  aria-label={`מחק ${prize.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.li>
            ))}
        </AnimatePresence>
      </ul>

      {/* Add form or Add button */}
      <AnimatePresence mode="wait">
        {showForm ? (
          <AddPrizeForm
            key="form"
            onAdd={handleAdd}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <motion.button
            key="add-btn"
            type="button"
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors active:scale-[0.98]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Plus className="w-4 h-4" />
            {t("prizes.addPrize")}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
