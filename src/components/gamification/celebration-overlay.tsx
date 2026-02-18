"use client";

import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { haptic } from "@/lib/haptics";

type CelebrationType = "task" | "all_daily" | "golden_rule" | "streak";

interface CelebrationOverlayProps {
  type: CelebrationType;
  message: string;
  emoji?: string;
  visible: boolean;
  onDismiss: () => void;
}

export function CelebrationOverlay({
  type,
  message,
  emoji = "🎉",
  visible,
  onDismiss,
}: CelebrationOverlayProps) {
  const fireConfetti = useCallback(() => {
    if (type === "task") {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#4F46E5", "#22C55E", "#EAB308"],
      });
    } else if (type === "all_daily") {
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#4F46E5", "#22C55E", "#EAB308"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#4F46E5", "#22C55E", "#EAB308"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else if (type === "streak") {
      // Fireworks-style burst for streak milestones
      const colors = ["#FF6B35", "#FF4500", "#FFD700", "#FFA500"];
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          confetti({
            particleCount: 25,
            spread: 50,
            startVelocity: 35,
            origin: {
              x: 0.2 + Math.random() * 0.6,
              y: 0.4 + Math.random() * 0.3,
            },
            colors,
            ticks: 100,
          });
        }, i * 300);
      }
    } else {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#4F46E5", "#22C55E", "#FFD700"],
        gravity: 0.8,
      });
    }
  }, [type]);

  useEffect(() => {
    if (visible) {
      haptic("celebration");
      fireConfetti();
      const timer = setTimeout(onDismiss, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, fireConfetti, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full bg-success flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
            >
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </motion.div>
            <motion.span
              className="text-5xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              {emoji}
            </motion.span>
            <motion.p
              className="text-xl font-bold text-foreground bg-surface/90 px-6 py-3 rounded-2xl shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {message}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
