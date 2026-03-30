/**
 * Unit tests for offline queue behavior.
 * Tests localStorage persistence logic, queue structure, and action payloads.
 * Note: Hook rendering tests require jsdom; these tests cover the pure logic layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QueuedAction } from "@/hooks/useOfflineQueue";

// ── localStorage mock ──────────────────────────────────────────────────────────

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = localStorageMock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = (globalThis as any).window ?? globalThis;

const QUEUE_KEY = "bayit-offline-queue";

// ── Pure helpers (mirroring hook internals) ───────────────────────────────────

function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorageMock.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]): void {
  localStorageMock.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function makeAction(
  type: QueuedAction["type"],
  payload: Record<string, unknown>
): QueuedAction {
  return {
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    timestamp: Date.now(),
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ── Queue storage ─────────────────────────────────────────────────────────────

describe("offline queue — storage", () => {
  it("loadQueue returns empty array when localStorage has no entry", () => {
    const queue = loadQueue();
    expect(queue).toEqual([]);
  });

  it("saveQueue persists an action to localStorage", () => {
    const action = makeAction("complete_task", { taskId: "t1" });
    saveQueue([action]);
    const stored = localStorageMock.getItem(QUEUE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as QueuedAction[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("complete_task");
  });

  it("loadQueue round-trips: save then load returns the same queue", () => {
    const actions: QueuedAction[] = [
      makeAction("complete_task", { taskId: "t1" }),
      makeAction("add_shopping_item", { name: "חלב" }),
    ];
    saveQueue(actions);
    const loaded = loadQueue();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].type).toBe("complete_task");
    expect(loaded[1].type).toBe("add_shopping_item");
  });

  it("loadQueue handles corrupted JSON gracefully", () => {
    localStorageMock.setItem(QUEUE_KEY, "{{invalid}}");
    const queue = loadQueue();
    expect(queue).toEqual([]);
  });
});

// ── Action structure ──────────────────────────────────────────────────────────

describe("offline queue — action structure", () => {
  it("action has required fields: id, type, payload, timestamp", () => {
    const action = makeAction("toggle_shopping_item", { itemId: "i1" });
    expect(typeof action.id).toBe("string");
    expect(action.id.startsWith("offline-")).toBe(true);
    expect(action.type).toBe("toggle_shopping_item");
    expect(action.payload).toEqual({ itemId: "i1" });
    expect(typeof action.timestamp).toBe("number");
    expect(action.timestamp).toBeGreaterThan(0);
  });

  it("pending count reflects saved queue length", () => {
    const actions: QueuedAction[] = [
      makeAction("complete_task", { taskId: "t1" }),
      makeAction("complete_task", { taskId: "t2" }),
      makeAction("add_shopping_item", { name: "לחם" }),
    ];
    saveQueue(actions);
    const loaded = loadQueue();
    expect(loaded.length).toBe(3); // pendingCount mirrors queue length
  });
});

// ── processQueue simulation ───────────────────────────────────────────────────

describe("offline queue — processQueue simulation", () => {
  it("clears queue after all actions succeed", async () => {
    const actions: QueuedAction[] = [
      makeAction("complete_task", { taskId: "t1" }),
      makeAction("complete_task", { taskId: "t2" }),
    ];
    saveQueue(actions);

    const processAction = vi.fn().mockResolvedValue(true);
    const current = loadQueue();
    const remaining: QueuedAction[] = [];
    for (const action of current) {
      const ok = await processAction(action);
      if (!ok) remaining.push(action);
    }
    saveQueue(remaining);

    expect(loadQueue()).toHaveLength(0);
    expect(processAction).toHaveBeenCalledTimes(2);
  });

  it("retains failed actions in queue", async () => {
    const actions: QueuedAction[] = [
      makeAction("complete_task", { taskId: "t1" }),
    ];
    saveQueue(actions);

    const processAction = vi.fn().mockResolvedValue(false);
    const current = loadQueue();
    const remaining: QueuedAction[] = [];
    for (const action of current) {
      const ok = await processAction(action);
      if (!ok) remaining.push(action);
    }
    saveQueue(remaining);

    expect(loadQueue()).toHaveLength(1);
  });
});
