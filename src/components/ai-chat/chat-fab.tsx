"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { useAssistantReactions } from "@/hooks/useAssistantReactions";

// ---------------------------------------------------------------------------
// Sparkles icon (inline SVG — no extra dependency)
// ---------------------------------------------------------------------------

function SparklesIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Large star */}
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
      {/* Small star top-right */}
      <path d="M19 2l.75 2.25L22 5l-2.25.75L19 8l-.75-2.25L16 5l2.25-.75L19 2z" />
      {/* Small star bottom-left */}
      <path d="M5 16l.75 2.25L8 19l-2.25.75L5 22l-.75-2.25L2 19l2.25-.75L5 16z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ChatFAB
// ---------------------------------------------------------------------------

interface ChatFABProps {
  onClick: () => void;
  /** Whether the full assistant panel (ChatDrawer) is currently open. */
  panelOpen: boolean;
}

// How long an unread-reaction peek stays up before it auto-dismisses.
const PEEK_DURATION_MS = 6000;

export function ChatFAB({ onClick, panelOpen }: ChatFABProps) {
  const { t } = useTranslation();
  const { unreadCount, latest } = useAssistantReactions();

  // Which reaction id we've already shown a peek for, so re-renders (or the
  // same reaction persisting in state) don't re-trigger the peek animation.
  const shownForId = useRef<string | null>(null);
  const [peekVisible, setPeekVisible] = useState(false);

  // Both effects below genuinely synchronize local UI state with an outside
  // signal (a new reaction arriving; the panel's own open/closed prop) — a
  // timer-driven "show this transiently, then hide it" isn't something that
  // can be derived at render time, so a setState-in-effect is the correct
  // tool here, not a workaround. Matches the same tradeoff already accepted
  // throughout this codebase (useZoneConfig, usePetCollectionSync, and this
  // PR's own useAssistantVisibility all do the same thing for the same
  // reason).
  useEffect(() => {
    if (!latest || panelOpen) return;
    if (shownForId.current === latest.id) return;

    shownForId.current = latest.id;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    setPeekVisible(true);
    const timer = setTimeout(() => setPeekVisible(false), PEEK_DURATION_MS);
    return () => clearTimeout(timer);
  }, [latest, panelOpen]);

  // The panel opening is what "reads" a reaction — hide any peek immediately
  // rather than waiting out its timer once there's nothing left to peek at.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    if (panelOpen) setPeekVisible(false);
  }, [panelOpen]);

  const showUnreadDot = unreadCount > 0 && !panelOpen;

  return (
    <div
      className="fixed z-20 flex flex-col items-end gap-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 10rem)", insetInlineEnd: "1rem" }}
    >
      {/* Reaction peek — a brief, dismissible note near the bubble when the
          assistant notices something (e.g. a completed task) while the full
          panel is closed. Announced politely so screen-reader users hear it
          without an interruption; never opens the panel by itself. */}
      <AnimatePresence>
        {peekVisible && latest && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="max-w-[15rem] bg-surface border border-border rounded-2xl shadow-lg px-3.5 py-2.5 flex items-start gap-2"
          >
            <span className="text-lg leading-none shrink-0" aria-hidden="true">
              {latest.emoji ?? "💬"}
            </span>
            <p className="text-xs text-foreground leading-snug flex-1">{latest.message}</p>
            <button
              type="button"
              onClick={() => setPeekVisible(false)}
              aria-label={t("aiChat.dismissPeek")}
              className="shrink-0 -m-1 p-1 text-muted hover:text-foreground rounded-full"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Attention pulse ring — rendered once on mount */}
        <motion.span
          className="absolute inset-0 rounded-full gradient-primary pointer-events-none"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
          aria-hidden="true"
        />

        {/* The button */}
        <motion.button
          type="button"
          onClick={onClick}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.06 }}
          aria-label={showUnreadDot ? t("aiChat.openLabelUnread") : t("aiChat.openLabel")}
          className="relative w-14 h-14 rounded-full gradient-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          style={{ touchAction: "manipulation" }}
        >
          <SparklesIcon />
          {showUnreadDot && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -end-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-900"
            />
          )}
        </motion.button>
      </div>
    </div>
  );
}
