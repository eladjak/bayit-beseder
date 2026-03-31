"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export interface Prize {
  id: string;
  name: string;
  emoji: string;
  threshold: number;
  unlocked: boolean;
}

const STORAGE_KEY = "bayit-prizes";

const DEFAULT_PRIZES: Prize[] = [
  { id: "1", name: "גלידה לכולם", emoji: "🍦", threshold: 50, unlocked: false },
  { id: "2", name: "ערב סרט משפחתי", emoji: "🎬", threshold: 100, unlocked: false },
  { id: "3", name: "ארוחת מסעדה", emoji: "🍽️", threshold: 200, unlocked: false },
  { id: "4", name: "טיול משפחתי", emoji: "🏖️", threshold: 500, unlocked: false },
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

interface PrizeCardProps {
  currentPoints: number;
}

export function PrizeCard({ currentPoints }: PrizeCardProps) {
  const { t } = useTranslation();
  const [prizes, setPrizes] = useState<Prize[]>(DEFAULT_PRIZES);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const confettiFired = useRef(false);
  const prevPointsRef = useRef(currentPoints);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setPrizes(loadPrizes());
  }, []);

  // Detect newly unlocked prize and persist updated state
  useEffect(() => {
    if (prizes.length === 0) return;

    const updated = prizes.map((p) => ({
      ...p,
      unlocked: currentPoints >= p.threshold,
    }));

    // Check if any prize crossed the unlock threshold compared to prev points
    const prevPoints = prevPointsRef.current;
    const newlyUnlocked = updated.some(
      (p, i) => p.unlocked && !prizes[i].unlocked
    );

    // Also detect crossing a threshold for the first time this render
    const crossedThreshold = prizes.some(
      (p) => !p.unlocked && currentPoints >= p.threshold && prevPoints < p.threshold
    );

    prevPointsRef.current = currentPoints;

    const hasChanges = updated.some((p, i) => p.unlocked !== prizes[i].unlocked);
    if (hasChanges) {
      setPrizes(updated);
      savePrizes(updated);
    }

    if ((newlyUnlocked || crossedThreshold) && !confettiFired.current) {
      confettiFired.current = true;
      setJustUnlocked(true);
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      });
      const timer = setTimeout(() => {
        setJustUnlocked(false);
        confettiFired.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPoints]);

  const allUnlocked = prizes.every((p) => currentPoints >= p.threshold);

  // Next prize = lowest threshold that currentPoints hasn't reached yet
  const nextPrize = prizes
    .filter((p) => currentPoints < p.threshold)
    .sort((a, b) => a.threshold - b.threshold)[0];

  // If all unlocked, show celebration state
  if (allUnlocked) {
    return (
      <motion.div
        className="card-elevated rounded-2xl p-5 text-center space-y-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.div
          className="text-5xl"
          animate={{ scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          🏆
        </motion.div>
        <div className="space-y-1">
          <p className="text-base font-bold text-foreground">
            {t("prizes.title")}
          </p>
          <p className="text-sm text-muted">{t("prizes.unlocked")}</p>
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          {prizes.map((p) => (
            <span key={p.id} className="text-2xl">
              {p.emoji}
            </span>
          ))}
        </div>
      </motion.div>
    );
  }

  if (!nextPrize) return null;

  const progress = Math.min(currentPoints / nextPrize.threshold, 1);
  const pointsNeeded = nextPrize.threshold - currentPoints;
  const pointsNeededText = t("prizes.pointsNeeded").replace(
    "{n}",
    String(pointsNeeded)
  );

  return (
    <motion.div
      className="card-elevated rounded-2xl p-5 space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary shrink-0" />
        <p className="text-sm font-semibold text-muted">{t("prizes.nextPrize")}</p>
      </div>

      {/* Prize details */}
      <div className="flex items-center gap-4">
        {/* Emoji */}
        <AnimatePresence mode="wait">
          {justUnlocked ? (
            <motion.div
              key="unlocked"
              className="text-5xl"
              initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
              animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
              exit={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              {nextPrize.emoji}
            </motion.div>
          ) : (
            <motion.div
              key="locked"
              className="text-5xl"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {nextPrize.emoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Name + points needed */}
        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-base font-bold text-foreground truncate">
            {nextPrize.name}
          </p>
          <AnimatePresence mode="wait">
            {justUnlocked ? (
              <motion.p
                key="congrats"
                className="text-sm font-semibold text-green-600 dark:text-green-400"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                {t("prizes.unlocked")}
              </motion.p>
            ) : (
              <motion.p
                key="points-needed"
                className="text-sm text-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {pointsNeededText}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 bg-border/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            style={{ transformOrigin: "left" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>{currentPoints}</span>
          <span>{nextPrize.threshold}</span>
        </div>
      </div>

      {/* Unlocked prizes row */}
      {prizes.filter((p) => currentPoints >= p.threshold).length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
          <p className="text-xs text-muted shrink-0">פרסים שהושגו:</p>
          <div className="flex gap-1">
            {prizes
              .filter((p) => currentPoints >= p.threshold)
              .map((p) => (
                <span key={p.id} className="text-base" title={p.name}>
                  {p.emoji}
                </span>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
