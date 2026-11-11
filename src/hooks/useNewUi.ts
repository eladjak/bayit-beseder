"use client";

import { useSyncExternalStore } from "react";
import { useHouseholdUi } from "@/hooks/useHouseholdUi";
import { isNewUiBuild, overrideAllowed, UI_OVERRIDE_KEY } from "@/lib/ui-flag";

const CHANGE_EVENT = "bayit-ui-change";
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}
function snapshot() { return document.documentElement.dataset.ui === "v2"; }
function serverSnapshot(): boolean | null { return overrideAllowed() ? null : isNewUiBuild(); }

export function useNewUi(): boolean | null {
  useHouseholdUi();
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function setUiOverride(value: "v1" | "v2"): void {
  if (!overrideAllowed()) return;
  try {
    if (value === "v2") localStorage.setItem(UI_OVERRIDE_KEY, "v2");
    else localStorage.removeItem(UI_OVERRIDE_KEY);
  } catch { /* Storage may be unavailable; the current page can still update. */ }
  if (isNewUiBuild() || value === "v2") document.documentElement.dataset.ui = "v2";
  else delete document.documentElement.dataset.ui;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
