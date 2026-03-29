"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const QUEUE_KEY = "bayit-offline-queue";

function getQueueCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return 0;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

interface OfflineIndicatorProps {
  pendingCount?: number;
}

/**
 * OfflineIndicator — shows an amber banner when navigator.onLine is false.
 * Displays the number of queued actions waiting to sync.
 * Slides in from the top with framer-motion.
 */
export function OfflineIndicator({ pendingCount: externalCount }: OfflineIndicatorProps) {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [dismissed, setDismissed] = useState(false);
  const [localQueueCount, setLocalQueueCount] = useState(0);
  const pendingCount = externalCount ?? localQueueCount;

  useEffect(() => {
    // Read initial queue count
    setLocalQueueCount(getQueueCount());

    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false); // re-show indicator when next offline
    };
    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false); // always show when going offline
      setLocalQueueCount(getQueueCount());
    };

    // Poll queue count when offline (every 2s)
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (!navigator.onLine) {
      pollInterval = setInterval(() => {
        setLocalQueueCount(getQueueCount());
      }, 2000);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const visible = !isOnline && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="offline-banner"
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          role="alert"
          aria-live="assertive"
          dir="rtl"
          className="mx-4 mt-2 mb-1 z-50"
        >
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/50">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                {t("offline.title")}
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                {pendingCount > 0
                  ? t("offline.pendingActions").replace("{count}", String(pendingCount))
                  : t("offline.subtitle")}
              </p>
            </div>
            {pendingCount > 0 && (
              <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label={t("offline.dismiss")}
              className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
