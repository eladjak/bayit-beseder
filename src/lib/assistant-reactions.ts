/**
 * Assistant reactions — a tiny, framework-free store that lets any part of
 * the app (today: the dashboard's task-completion flow) hand a short
 * "the app noticed something" message to the persistent AI-assistant
 * bubble in the app shell, wherever the user currently is.
 *
 * This is deliberately NOT a general event bus. It has exactly one purpose
 * (a small, capped feed of assistant reactions) and exactly one consumer
 * shape (a React hook via useSyncExternalStore). If a future need shows up
 * for a second, unrelated kind of cross-page event, that is a new decision,
 * not an extension of this file.
 *
 * Reactions live in memory only (module-level state) and are NOT persisted
 * across a reload — only the assistant's visible/hidden preference
 * (see useAssistantVisibility) is meant to survive a reload. A reaction is,
 * by nature, about something that "just happened"; replaying an old one
 * after a fresh page load would be confusing, not helpful.
 */

export interface AssistantReaction {
  id: string;
  message: string;
  emoji?: string;
  /** epoch ms, for stable sort/testing — not shown in the UI */
  createdAt: number;
}

// Cap how much history we keep. This is a "what just happened" feed, not a log.
const MAX_REACTIONS = 20;

export interface AssistantReactionsSnapshot {
  reactions: AssistantReaction[];
  unreadCount: number;
}

let reactions: AssistantReaction[] = [];
let unreadCount = 0;
let nextId = 1;
const listeners = new Set<() => void>();

// useSyncExternalStore requires getSnapshot to return a referentially-stable
// value when nothing has changed (it compares with Object.is on every render
// to decide whether to re-render) — a fresh object literal on every call
// would look like a change every time and either re-render constantly or, in
// React's strict dev checks, throw "getSnapshot should be cached". So the
// snapshot object is only ever rebuilt inside notify(), right after a real
// state change, and every other read returns that same cached reference.
let snapshot: AssistantReactionsSnapshot = { reactions, unreadCount };

function notify() {
  snapshot = { reactions, unreadCount };
  for (const listener of listeners) listener();
}

/**
 * Record a new assistant reaction (e.g. a coaching message after a task is
 * completed) and notify every subscriber. Newest-first order.
 */
export function pushAssistantReaction(message: string, emoji?: string): AssistantReaction {
  const reaction: AssistantReaction = {
    id: `reaction-${nextId++}`,
    message,
    emoji,
    createdAt: Date.now(),
  };
  reactions = [reaction, ...reactions].slice(0, MAX_REACTIONS);
  unreadCount += 1;
  notify();
  return reaction;
}

/** Mark every reaction seen so far as read (called when the assistant opens). */
export function markAssistantReactionsRead(): void {
  if (unreadCount === 0) return;
  unreadCount = 0;
  notify();
}

export function subscribeAssistantReactions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAssistantReactionsSnapshot(): AssistantReactionsSnapshot {
  return snapshot;
}

/** Test-only: reset all module state between test cases. */
export function __resetAssistantReactionsForTests(): void {
  reactions = [];
  unreadCount = 0;
  nextId = 1;
  listeners.clear();
  snapshot = { reactions, unreadCount };
}
