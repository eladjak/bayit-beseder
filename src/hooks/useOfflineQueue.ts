"use client";

import { useState, useEffect, useCallback } from "react";

export interface QueuedAction {
  id: string;
  type: "complete_task" | "add_shopping_item" | "toggle_shopping_item";
  payload: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = "bayit-offline-queue";

function loadQueue(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function generateId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * useOfflineQueue — queues actions when offline, processes them when reconnected.
 *
 * Returns:
 * - queueAction: add an action to the queue
 * - pendingCount: number of unprocessed actions
 * - isOnline: current network status
 * - processQueue: manually trigger processing (called automatically on reconnect)
 */
export function useOfflineQueue(
  processAction?: (action: QueuedAction) => Promise<boolean>
) {
  const [queue, setQueue] = useState<QueuedAction[]>(() => loadQueue());
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== "undefined" ? navigator.onLine : true
  );

  // Sync queue state to localStorage whenever it changes
  useEffect(() => {
    saveQueue(queue);
  }, [queue]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const queueAction = useCallback(
    (type: QueuedAction["type"], payload: Record<string, unknown>): QueuedAction => {
      const action: QueuedAction = {
        id: generateId(),
        type,
        payload,
        timestamp: Date.now(),
      };
      setQueue((prev) => {
        const updated = [...prev, action];
        saveQueue(updated);
        return updated;
      });
      return action;
    },
    []
  );

  const processQueue = useCallback(async () => {
    if (!processAction) return;
    const current = loadQueue();
    if (current.length === 0) return;

    const remaining: QueuedAction[] = [];
    for (const action of current) {
      try {
        const success = await processAction(action);
        if (!success) {
          remaining.push(action);
        }
      } catch {
        remaining.push(action);
      }
    }
    setQueue(remaining);
    saveQueue(remaining);
  }, [processAction]);

  // Auto-process queue when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && processAction) {
      processQueue();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    queueAction,
    pendingCount: queue.length,
    isOnline,
    processQueue,
    queue,
  };
}
