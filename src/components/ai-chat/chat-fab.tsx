"use client";

import { motion } from "framer-motion";

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
}

export function ChatFAB({ onClick }: ChatFABProps) {
  return (
    <div className="fixed bottom-24 right-4 z-20">
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
        aria-label="פתח עוזר חכם"
        className="relative w-14 h-14 rounded-full gradient-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        style={{ touchAction: "manipulation" }}
      >
        <SparklesIcon />
      </motion.button>
    </div>
  );
}
