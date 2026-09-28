/**
 * Tests for useAssistantReactions — the React binding over the
 * assistant-reactions store, plus its use in the two consumers that matter
 * for the assistant's minimize/unread behavior:
 * - the unread dot's source of truth (unreadCount)
 * - the unread dot clearing when the panel opens (markAllRead)
 * - the latest reaction surfacing (used for both the FAB peek and the
 *   drawer's "recent reactions" block)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  pushAssistantReaction,
  __resetAssistantReactionsForTests,
} from "@/lib/assistant-reactions";
import { useAssistantReactions } from "@/hooks/useAssistantReactions";

beforeEach(() => {
  __resetAssistantReactionsForTests();
});

afterEach(() => {
  __resetAssistantReactionsForTests();
});

describe("useAssistantReactions", () => {
  it("starts with no unread reactions and a null latest", () => {
    const { result } = renderHook(() => useAssistantReactions());
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.latest).toBeNull();
    expect(result.current.reactions).toEqual([]);
  });

  it("re-renders with the new reaction and an incremented unread count when one is pushed", () => {
    const { result } = renderHook(() => useAssistantReactions());

    act(() => {
      pushAssistantReaction("משימה הושלמה!", "✅");
    });

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.latest?.message).toBe("משימה הושלמה!");
    expect(result.current.reactions).toHaveLength(1);
  });

  it("clears unreadCount when markAllRead is called, without dropping the reaction itself", () => {
    const { result } = renderHook(() => useAssistantReactions());

    act(() => {
      pushAssistantReaction("א");
      pushAssistantReaction("ב");
    });
    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    // The reaction is still there to show as "recent" in the drawer — only
    // the unread indicator clears, the message doesn't disappear.
    expect(result.current.reactions).toHaveLength(2);
    expect(result.current.latest?.message).toBe("ב");
  });

  it("two independent hook instances see the same store (app-wide, not per-component)", () => {
    const a = renderHook(() => useAssistantReactions());
    const b = renderHook(() => useAssistantReactions());

    act(() => {
      pushAssistantReaction("broadcast");
    });

    // This is the behavior the whole feature depends on: a reaction pushed
    // from the dashboard page must be visible to the FAB/drawer mounted in
    // the app shell — a different component tree entirely.
    expect(a.result.current.latest?.message).toBe("broadcast");
    expect(b.result.current.latest?.message).toBe("broadcast");
  });
});
