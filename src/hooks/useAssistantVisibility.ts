"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bayit-assistant-visible";

function readStored(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === "1";
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — default to visible.
    return true;
  }
}

function writeStored(visible: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, visible ? "1" : "0");
  } catch {
    // Nothing to do — the toggle still works for this tab/session.
  }
}

/**
 * Whether the floating AI-assistant entry point (the chat bubble) should be
 * shown. Persisted per browser so a user who hides it stays in control of
 * their own screen. Defaults to visible — hiding it is an explicit choice,
 * not a state a first-time user can land in by accident.
 */
export function useAssistantVisibility() {
  // Deliberately NOT a lazy useState initializer: this renders "visible" on
  // both the server and the client's first pass, then syncs from
  // localStorage after mount. A lazy initializer would read localStorage
  // during the client's first render too, which can disagree with the
  // server-rendered HTML and trigger a hydration mismatch — the same
  // effect-then-setState shape already used by useZoneConfig and
  // usePetCollectionSync elsewhere in this app for the same reason. The
  // lint rule below flags the pattern; the hydration bug it would avoid
  // creating is worse than the warning.
  const [visible, setVisibleState] = useState<boolean>(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    setVisibleState(readStored());
  }, []);

  const setVisible = useCallback((next: boolean) => {
    setVisibleState(next);
    writeStored(next);
  }, []);

  return { visible, setVisible };
}
