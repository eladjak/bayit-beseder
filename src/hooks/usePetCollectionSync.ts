"use client";

/**
 * usePetCollectionSync — auto-unlocks pets when streak crosses thresholds.
 *
 * Hook-friendly wrapper around syncCollectionWithStreak.
 * Returns newly-unlocked pets (for celebration toast).
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { useEffect, useState } from "react";
import { syncCollectionWithStreak, type Pet } from "@/lib/pets";

export function usePetCollectionSync(currentStreak: number): readonly Pet[] {
  const [newlyUnlocked, setNewlyUnlocked] = useState<readonly Pet[]>([]);

  useEffect(() => {
    if (!Number.isFinite(currentStreak) || currentStreak < 0) return;
    const unlocked = syncCollectionWithStreak(currentStreak);
    if (unlocked.length > 0) setNewlyUnlocked(unlocked);
  }, [currentStreak]);

  return newlyUnlocked;
}
