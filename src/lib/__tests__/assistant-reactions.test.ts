/**
 * Unit tests for the assistant-reactions store — the shared, in-memory feed
 * that lets the dashboard's task-completion flow hand a reaction to the
 * app-wide floating assistant bubble.
 *
 * Sabotage check for this suite was done by hand, not encoded as a permanent
 * test here (a fake "broken" stand-in test proves nothing about the real
 * module): assistant-reactions.ts's `unreadCount += 1` line was commented
 * out, `bun run test src/lib/__tests__/assistant-reactions.test.ts` was run
 * and confirmed RED — specifically on "pushAssistantReaction adds a
 * reaction and increments unreadCount" and "increments unreadCount for
 * every push, not just the first", both for the expected reason (unreadCount
 * stayed 0) — then the line was restored and the suite re-confirmed green.
 * See PR #17's description for the transcript of both runs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  pushAssistantReaction,
  markAssistantReactionsRead,
  getAssistantReactionsSnapshot,
  subscribeAssistantReactions,
  __resetAssistantReactionsForTests,
} from "@/lib/assistant-reactions";

beforeEach(() => {
  __resetAssistantReactionsForTests();
});

describe("assistant-reactions store", () => {
  it("starts empty with zero unread", () => {
    const snap = getAssistantReactionsSnapshot();
    expect(snap.reactions).toEqual([]);
    expect(snap.unreadCount).toBe(0);
  });

  it("pushAssistantReaction adds a reaction and increments unreadCount", () => {
    pushAssistantReaction("כל הכבוד!", "🎉");
    const snap = getAssistantReactionsSnapshot();
    expect(snap.reactions).toHaveLength(1);
    expect(snap.reactions[0].message).toBe("כל הכבוד!");
    expect(snap.reactions[0].emoji).toBe("🎉");
    expect(snap.unreadCount).toBe(1);
  });

  it("keeps reactions newest-first", () => {
    pushAssistantReaction("first");
    pushAssistantReaction("second");
    const snap = getAssistantReactionsSnapshot();
    expect(snap.reactions.map((r) => r.message)).toEqual(["second", "first"]);
  });

  it("increments unreadCount for every push, not just the first", () => {
    pushAssistantReaction("a");
    pushAssistantReaction("b");
    pushAssistantReaction("c");
    expect(getAssistantReactionsSnapshot().unreadCount).toBe(3);
  });

  it("markAssistantReactionsRead clears unreadCount but keeps the reactions list", () => {
    pushAssistantReaction("a");
    pushAssistantReaction("b");
    markAssistantReactionsRead();
    const snap = getAssistantReactionsSnapshot();
    expect(snap.unreadCount).toBe(0);
    expect(snap.reactions).toHaveLength(2);
  });

  it("caps the reactions list at 20 entries", () => {
    for (let i = 0; i < 25; i++) pushAssistantReaction(`msg-${i}`);
    const snap = getAssistantReactionsSnapshot();
    expect(snap.reactions).toHaveLength(20);
    // Newest-first: the most recent 20 pushes are msg-5..msg-24
    expect(snap.reactions[0].message).toBe("msg-24");
    expect(snap.reactions.at(-1)?.message).toBe("msg-5");
  });

  it("notifies subscribers on push and on markRead", () => {
    let calls = 0;
    const unsubscribe = subscribeAssistantReactions(() => { calls += 1; });

    pushAssistantReaction("hello");
    expect(calls).toBe(1);

    markAssistantReactionsRead();
    expect(calls).toBe(2);

    unsubscribe();
    pushAssistantReaction("after unsubscribe");
    expect(calls).toBe(2); // unchanged — this subscriber stopped listening
  });

  it("does not notify on a no-op markRead (already zero unread)", () => {
    let calls = 0;
    subscribeAssistantReactions(() => { calls += 1; });
    markAssistantReactionsRead(); // already 0 — should be a no-op
    expect(calls).toBe(0);
  });

  it("returns a referentially-stable snapshot between reads with no change (required by useSyncExternalStore)", () => {
    pushAssistantReaction("stable?");
    const a = getAssistantReactionsSnapshot();
    const b = getAssistantReactionsSnapshot();
    expect(a).toBe(b);
  });
});
