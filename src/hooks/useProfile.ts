"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { ProfileRow, ProfileUpdate } from "@/lib/types/database";

interface UseProfileReturn {
  profile: ProfileRow | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: ProfileUpdate) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook to get and update the current user's profile from Supabase.
 * Returns null profile (no error) when Supabase is not connected or user not logged in.
 */
export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, points, streak, partner_id, household_id, notification_preferences, created_at, updated_at")
        .eq("id", user.id)
        .single();

      if (fetchError) {
        // Table might not exist yet or no row - not a critical error for fallback
        setError(fetchError.message);
        setProfile(null);
      } else if (data) {
        setProfile({
          id: data.id,
          name: data.display_name ?? user.email?.split("@")[0] ?? "משתמש",
          avatar_url: data.avatar_url,
          points: data.points ?? 0,
          streak: data.streak ?? 0,
          partner_id: data.partner_id ?? null,
          household_id: data.household_id ?? null,
          notification_preferences: data.notification_preferences ?? null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      }
    } catch {
      // Supabase not available - silently return null
      setProfile(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<boolean> => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return false;

        // Map ProfileUpdate fields to the actual table columns
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.display_name = updates.name;
        if (updates.avatar_url !== undefined)
          dbUpdates.avatar_url = updates.avatar_url;
        if (updates.notification_preferences !== undefined)
          dbUpdates.notification_preferences = updates.notification_preferences;

        const { error: updateError } = await supabase
          .from("profiles")
          .update(dbUpdates)
          .eq("id", user.id);

        if (updateError) {
          setError(updateError.message);
          return false;
        }

        // Update local state immutably
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                ...(updates.name !== undefined ? { name: updates.name } : {}),
                ...(updates.avatar_url !== undefined
                  ? { avatar_url: updates.avatar_url }
                  : {}),
                ...(updates.points !== undefined
                  ? { points: updates.points }
                  : {}),
                ...(updates.streak !== undefined
                  ? { streak: updates.streak }
                  : {}),
                ...(updates.notification_preferences !== undefined
                  ? { notification_preferences: updates.notification_preferences }
                  : {}),
              }
            : null
        );

        return true;
      } catch {
        return false;
      }
    },
    []
  );

  return { profile, loading, error, updateProfile, refetch: fetchProfile };
}
