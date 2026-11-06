"use client";

import { useEffect, useRef, useState } from "react";
import { syncCollectionWithStreak, type Pet } from "@/lib/pets";
import { syncBackgroundCollectionWithStreak, type Background } from "@/lib/backgrounds";

/** Sync the first known streak silently, then celebrate newly earned items. */
function useStreakCollection<T>(streak: number | null, sync: (streak: number) => readonly T[]): readonly T[] {
  const [newlyUnlocked, setNewlyUnlocked] = useState<readonly T[]>([]);
  const previousStreak = useRef<number | null>(null);

  useEffect(() => {
    if (streak === null || !Number.isFinite(streak) || streak < 0) return;
    const timer = window.setTimeout(() => {
      const unlocked = sync(streak);
      const advanced = previousStreak.current !== null && streak > previousStreak.current;
      previousStreak.current = streak;
      if (advanced && unlocked.length > 0) setNewlyUnlocked(unlocked);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [streak, sync]);

  return newlyUnlocked;
}

export function usePetCollectionSync(streak: number | null): readonly Pet[] {
  return useStreakCollection(streak, syncCollectionWithStreak);
}

export function useBackgroundCollectionSync(streak: number | null): readonly Background[] {
  return useStreakCollection(streak, syncBackgroundCollectionWithStreak);
}
