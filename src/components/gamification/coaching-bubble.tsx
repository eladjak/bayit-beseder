"use client";

import { motion, AnimatePresence } from "framer-motion";

interface CoachingBubbleProps {
  visible: boolean;
  message: string;
  emoji?: string;
  onDismiss: () => void;
}

export function CoachingBubble({
  visible,
  message,
  emoji = "💪",
  onDismiss,
}: CoachingBubbleProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-24 left-4 right-4 z-40 flex justify-center"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
        >
          <button
            onClick={onDismiss}
            className="bg-surface shadow-lg rounded-2xl px-5 py-3 flex items-center gap-3 border border-border max-w-sm w-full"
          >
            <span className="text-2xl flex-shrink-0">{emoji}</span>
            <p className="text-sm font-medium text-foreground text-right flex-1">
              {message}
            </p>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
