"use client";

import { useSyncExternalStore } from "react";
import {
  getAssistantReactionsSnapshot,
  markAssistantReactionsRead,
  subscribeAssistantReactions,
  type AssistantReactionsSnapshot,
} from "@/lib/assistant-reactions";

// Server has no notion of "reactions that happened" — there is nothing to
// react to before the page has even loaded. A fixed empty snapshot avoids
// needing a client-only guard in every consumer and can never mismatch the
// client's own empty starting state (the real store also starts empty).
const SERVER_SNAPSHOT: AssistantReactionsSnapshot = { reactions: [], unreadCount: 0 };

/**
 * Live view of the assistant-reactions store (see src/lib/assistant-reactions.ts).
 * `markAllRead` should be called when the assistant's full panel is opened.
 */
export function useAssistantReactions() {
  const snapshot = useSyncExternalStore(
    subscribeAssistantReactions,
    getAssistantReactionsSnapshot,
    () => SERVER_SNAPSHOT,
  );

  return {
    reactions: snapshot.reactions,
    unreadCount: snapshot.unreadCount,
    latest: snapshot.reactions[0] ?? null,
    markAllRead: markAssistantReactionsRead,
  };
}
