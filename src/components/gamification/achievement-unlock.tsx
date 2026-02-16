"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X } from "lucide-react";

interface AchievementUnlockProps {
  visible: boolean;
  title: string;
  description: string;
  icon: string;
  onDismiss: () => void;
}

export function AchievementUnlock({
  visible,
  title,
  description,
  icon,
  onDismiss,
}: AchievementUnlockProps) {
  useEffect(() => {
    if (visible) {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#FFA500", "#4F46E5"],
      });
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            className="bg-surface rounded-3xl p-8 mx-6 max-w-sm w-full shadow-xl text-center"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onDismiss}
              className="absolute top-4 left-4 text-muted hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.div
              className="text-amber-400 mb-2"
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <Trophy className="w-12 h-12 mx-auto" />
            </motion.div>
            <p className="text-sm font-medium text-primary mb-3">הישג חדש!</p>
            <motion.span
              className="text-5xl block mb-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
            >
              {icon}
            </motion.span>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-muted text-sm">{description}</p>
            <button
              onClick={onDismiss}
              className="mt-6 px-8 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              יופי!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
