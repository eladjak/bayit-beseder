"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface UserAchievementRecord {
  achievement_id: string;
  unlocked_at: string;
  /** The `code` field from the achievements table (joined) */
  code: string;
}

interface UseUserAchievementsReturn {
  /** Set of achievement codes that the current user has unlocked in the DB */
  dbUnlockedCodes: Set<string>;
  loading: boolean;
  /** Whether the DB query succeeded (false means we should use client-side fallback) */
  hasDbData: boolean;
  refetch: () => Promise<void>;
}

/**
 * Fetches the current user's unlocked achievements from `user_achievements`
 * joined with `achievements` to get the `code` field.
 *
 * Falls back gracefully when Supabase is unavailable or the user is not logged in.
 */
export function useUserAchievements(): UseUserAchievementsReturn {
  const [dbUnlockedCodes, setDbUnlockedCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasDbData, setHasDbData] = useState(false);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Join user_achievements with achievements to get the code
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at, achievements(code)")
        .eq("user_id", user.id);

      if (error || !data) {
        setHasDbData(false);
        setLoading(false);
        return;
      }

      const codes = new Set<string>();
      for (const row of data) {
        const ach = row.achievements as { code: string } | null;
        if (ach?.code) {
          codes.add(ach.code);
        }
      }

      setDbUnlockedCodes(codes);
      setHasDbData(true);
    } catch {
      // Supabase not available - use client-side fallback
      setHasDbData(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return { dbUnlockedCodes, loading, hasDbData, refetch: fetchAchievements };
}
