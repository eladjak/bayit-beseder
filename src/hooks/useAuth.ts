"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True when there is an authenticated user */
  isAuthenticated: boolean;
  /** Re-check auth state */
  refresh: () => Promise<void>;
}

/**
 * Hook that tracks Supabase auth state and listens for changes.
 * Returns null user (no error) when auth is unavailable (demo mode).
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    } catch {
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Listen for auth state changes (login, logout, token refresh)
    try {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // Supabase not available
      setLoading(false);
      return undefined;
    }
  }, [refresh]);

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    refresh,
  };
}
