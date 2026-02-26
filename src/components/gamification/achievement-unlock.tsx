"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X } from "lucide-react";
import { haptic } from "@/lib/haptics";

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
      haptic("celebration");
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
            className="bg-surface dark:bg-[#1a1730] rounded-3xl p-8 mx-6 max-w-sm w-full shadow-xl dark:shadow-black/50 text-center relative overflow-hidden"
            initial={{ y: 200, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 200, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Radial glow behind trophy */}
            <motion.div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <button
              onClick={onDismiss}
              className="absolute top-4 left-4 text-muted hover:text-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.div
              className="text-amber-400 mb-2 relative z-10"
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <Trophy className="w-12 h-12 mx-auto" />
            </motion.div>
            <p className="text-sm font-medium text-primary mb-3 relative z-10">
              הישג חדש!
            </p>
            <motion.span
              className="text-5xl block mb-3 relative z-10"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
            >
              {icon}
            </motion.span>
            <h3 className="text-xl font-bold mb-2 relative z-10">{title}</h3>
            <p className="text-muted text-sm relative z-10">{description}</p>
            <button
              onClick={onDismiss}
              className="mt-6 px-8 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors relative z-10"
            >
              יופי!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
