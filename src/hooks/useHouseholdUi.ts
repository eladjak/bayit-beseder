"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { householdAllowsNewUi, isNewUiBuild, overrideAllowed, UI_OVERRIDE_KEY } from "@/lib/ui-flag";

// Memory only: shared by mounted consumers and discarded on logout or account change.
let cachedUser: string | null = null;
let cachedQuery: Promise<boolean> | null = null;
let generation = 0;
let activeConsumers = 0;

function restoreBaseFlag() {
  let override = false;
  try { override = overrideAllowed() && localStorage.getItem(UI_OVERRIDE_KEY) === "v2"; } catch { /* storage unavailable */ }
  if (isNewUiBuild() || override) document.documentElement.dataset.ui = "v2";
  else delete document.documentElement.dataset.ui;
  window.dispatchEvent(new Event("bayit-ui-change"));
}

export function useHouseholdUi(): void {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  useEffect(() => {
    if (loading) return;
    if (cachedUser !== userId) {
      cachedUser = userId;
      cachedQuery = null;
      generation++;
      restoreBaseFlag();
    }
    if (!userId || !isSupabaseConfigured()) return;
    const currentGeneration = generation;
    if (!cachedQuery) {
      cachedQuery = (async () => {
        try {
          const { data, error } = await createClient().from("ui_v2_households").select("household_id").limit(1);
          return !error && householdAllowsNewUi(data?.[0] ?? null);
        } catch { return false; }
      })();
    }
    let active = true;
    activeConsumers++;
    cachedQuery.then((allowed) => {
      if (!active || currentGeneration !== generation || cachedUser !== userId) return;
      if (allowed) {
        document.documentElement.dataset.ui = "v2";
        window.dispatchEvent(new Event("bayit-ui-change"));
      }
    });
    return () => {
      active = false;
      activeConsumers--;
      if (activeConsumers === 0) {
        generation++;
        restoreBaseFlag();
      }
    };
  }, [userId, loading]);
}
