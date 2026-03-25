"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COACHING_MESSAGES } from "@/lib/coaching-messages";
import type { CoachingTrigger } from "@/lib/coaching-messages";

// ─── helpers ────────────────────────────────────────────────────────────────

interface CoachingTipsProps {
  completedCount: number;
  totalCount: number;
}

function pickTrigger(completedCount: number, totalCount: number): CoachingTrigger {
  if (totalCount === 0) return "low_motivation";
  const pct = completedCount / totalCount;
  if (pct >= 1) return "all_daily_done";
  if (pct >= 0.8) return "golden_rule_hit";
  if (completedCount > 0) return "task_complete";
  return "low_motivation";
}

/** "Why" explanations for each trigger — shown when user taps למה? */
const WHY_EXPLANATIONS: Record<CoachingTrigger, string> = {
  task_complete: "כל משימה שמושלמת מחזקת את ההרגל ועוזרת לשמור על הבית בסדר לאורך זמן 🧠",
  streak: "עקביות היא המפתח — גם ימים קטנים בונים תנועה גדולה לאורך זמן 🔄",
  golden_rule_hit: "80% זה ה'כלל הזהב' של ניהול הבית — מספיק כדי לחיות בנוחות, בלי שלמות-מלחיצה 💡",
  all_daily_done: "לסיים יום שלם של משימות זה הישג אמיתי! זה בונה תחושת שליטה ורגיעה 🌙",
  emergency: "בתקופות קשות, לתת לעצמנו רשות לעשות פחות זה בריאות נפשית, לא עצלות 💙",
  low_motivation: "מחקרים מראים שהכי קשה זה להתחיל — אחרי 2 דקות הגוף נכנס לפעולה לבד ⚡",
  partner_complete: "עבודת צוות בבית מפחיתה מתחים ומחזקת את הקשר — שני הצדדים מרוצים 🤝",
};

// ─── Typing dots animation ────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2" aria-label="מקליד...">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/50"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ─── Chat bubble ─────────────────────────────────────────────────────────────

interface BubbleProps {
  emoji: string;
  text: string;
}

function CoachBubble({ emoji, text }: BubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      className="flex items-start gap-2"
    >
      {/* Avatar */}
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-base leading-none">
        🤖
      </span>
      {/* Bubble */}
      <div className="flex-1 min-w-0 rounded-2xl rounded-tr-sm bg-primary/8 dark:bg-primary/15 border border-primary/10 dark:border-primary/20 px-3 py-2">
        <p className="text-[11px] font-semibold text-primary/70 dark:text-primary/50 mb-0.5">
          {emoji} המאמן
        </p>
        <p className="text-sm text-foreground leading-snug">{text}</p>
      </div>
    </motion.div>
  );
}

// ─── Action chips ─────────────────────────────────────────────────────────────

interface ChipsProps {
  onNextTip: () => void;
  onWhy: () => void;
  onThanks: () => void;
  showWhy: boolean;
  showThanks: boolean;
}

function ActionChips({ onNextTip, onWhy, onThanks, showWhy, showThanks }: ChipsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: 0.12 }}
      className="flex items-center gap-2 pr-9 flex-wrap"
    >
      <button
        onClick={onNextTip}
        className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border text-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-95"
        aria-label="הצג טיפ הבא"
      >
        עוד טיפ 💡
      </button>
      {showWhy && (
        <button
          onClick={onWhy}
          className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border text-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-95"
          aria-label="למה?"
        >
          למה? 🤔
        </button>
      )}
      {showThanks && (
        <button
          onClick={onThanks}
          className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border text-muted hover:bg-surface/80 transition-colors active:scale-95"
          aria-label="תודה"
        >
          תודה! 😊
        </button>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ViewState = "tip" | "typing" | "why" | "thanks";

export function CoachingTips({ completedCount, totalCount }: CoachingTipsProps) {
  const trigger = useMemo(
    () => pickTrigger(completedCount, totalCount),
    [completedCount, totalCount]
  );

  const pool = useMemo(
    () => COACHING_MESSAGES.filter((m) => m.trigger === trigger),
    [trigger]
  );

  // Deterministic starting index based on day of month so it doesn't flicker on re-render
  const [tipIndex, setTipIndex] = useState<number>(() => new Date().getDate() % pool.length);
  const [view, setView] = useState<ViewState>("tip");

  // When trigger changes (e.g. user completes more tasks), reset to a fresh tip
  useEffect(() => {
    setTipIndex(new Date().getDate() % pool.length);
    setView("tip");
  }, [trigger, pool.length]);

  const tip = pool[tipIndex] ?? pool[0];

  if (!tip) return null;

  const handleNextTip = () => {
    setView("typing");
    setTimeout(() => {
      setTipIndex((prev) => (prev + 1) % pool.length);
      setView("tip");
    }, 900);
  };

  const handleWhy = () => {
    setView("typing");
    setTimeout(() => setView("why"), 900);
  };

  const handleThanks = () => {
    setView("thanks");
  };

  const handleNewTipFromWhy = () => {
    setView("typing");
    setTimeout(() => {
      setTipIndex((prev) => (prev + 1) % pool.length);
      setView("tip");
    }, 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border p-4 shadow-sm space-y-3"
      dir="rtl"
      aria-label="טיפ יומי מהמאמן"
    >
      {/* Header */}
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">
        💬 טיפ יומי
      </p>

      {/* Chat area */}
      <div className="space-y-2 min-h-[52px]">
        <AnimatePresence mode="wait">
          {view === "typing" && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-base leading-none">
                🤖
              </span>
              <div className="rounded-2xl rounded-tr-sm bg-primary/8 dark:bg-primary/15 border border-primary/10 dark:border-primary/20">
                <TypingDots />
              </div>
            </motion.div>
          )}

          {view === "tip" && (
            <CoachBubble key={`tip-${tipIndex}`} emoji={tip.emoji} text={tip.message} />
          )}

          {view === "why" && (
            <CoachBubble
              key="why"
              emoji="💡"
              text={WHY_EXPLANATIONS[trigger]}
            />
          )}

          {view === "thanks" && (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 pr-9"
            >
              <p className="text-sm text-muted">
                😊 בכיף! כאן תמיד כשצריך טיפ נוסף.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action chips */}
      <AnimatePresence>
        {view === "tip" && (
          <ActionChips
            key="chips-tip"
            onNextTip={handleNextTip}
            onWhy={handleWhy}
            onThanks={handleThanks}
            showWhy={true}
            showThanks={true}
          />
        )}
        {view === "why" && (
          <ActionChips
            key="chips-why"
            onNextTip={handleNewTipFromWhy}
            onWhy={handleWhy}
            onThanks={handleThanks}
            showWhy={false}
            showThanks={true}
          />
        )}
        {view === "thanks" && (
          <motion.div
            key="chips-thanks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 pr-9"
          >
            <button
              onClick={() => {
                setTipIndex((prev) => (prev + 1) % pool.length);
                setView("tip");
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border text-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-95"
            >
              עוד טיפ 💡
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
