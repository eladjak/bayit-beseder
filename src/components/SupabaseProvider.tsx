"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseClientType = SupabaseClient<Database>;

const SupabaseContext = createContext<SupabaseClientType | null>(null);

/**
 * Provides a single shared Supabase client instance to all child components.
 * Hooks should use `useSupabase()` instead of calling `createClient()` directly.
 */
export function SupabaseProvider({ children }: { children: ReactNode }) {
  // createClient() is already a module-level singleton; useMemo ensures
  // we never call it more than once per provider mount.
  const supabase = useMemo(() => createClient(), []);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

/**
 * Returns the shared Supabase client from the nearest SupabaseProvider.
 * Falls back to creating a new client if used outside a provider (e.g. tests).
 */
export function useSupabase(): SupabaseClientType {
  const client = useContext(SupabaseContext);
  if (!client) {
    // Graceful fallback: create a client directly if no provider is present.
    return createClient();
  }
  return client;
}
