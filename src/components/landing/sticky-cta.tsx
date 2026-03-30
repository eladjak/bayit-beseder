"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Sticky bottom CTA bar — mobile-only (hidden md+).
 * Appears once the hero section has scrolled out of view.
 * Disappears when the hero is back in view.
 */
export function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-section");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="fixed bottom-0 inset-x-0 z-40 md:hidden"
          style={{
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            background: "rgba(var(--color-background-rgb, 255 255 255) / 0.88)",
            borderTop: "1px solid rgba(var(--color-border-rgb, 200 200 200) / 0.5)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <Link
              href="/login"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-base shadow-lg active:scale-95 transition-transform"
              style={{
                background:
                  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #D946EF 100%)",
              }}
            >
              🚀 התחילו בחינם
            </Link>
            <a
              href="#features"
              className="flex-shrink-0 px-4 py-3 rounded-2xl border border-border text-muted text-sm font-medium hover:bg-surface-hover active:scale-95 transition-all"
            >
              פרטים ↑
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
