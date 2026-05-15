"use client";

import { motion, AnimatePresence } from "framer-motion";

interface FeatureTooltipProps {
  visible: boolean;
  text: string;
  onDismiss: () => void;
  /**
   * Positioning hint relative to the target element.
   * "below" (default) — tooltip appears below, arrow points up.
   * "above"           — tooltip appears above, arrow points down.
   */
  position?: "below" | "above";
  /** Optional className to tweak placement (e.g. margin offsets). */
  className?: string;
}

export function FeatureTooltip({
  visible,
  text,
  onDismiss,
  position = "below",
  className = "",
}: FeatureTooltipProps) {
  const isBelow = position === "below";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="tooltip"
          dir="rtl"
          initial={{ opacity: 0, y: isBelow ? -8 : 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isBelow ? -8 : 8, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          // Use start-side anchoring (`start-0`) instead of `right-0` so the
          // tooltip stays on-screen for FABs pinned to the visual-left side in
          // RTL. Was off-screen for shopping FAB which sits at `left-4` —
          // tooltip's right-edge aligned to FAB's right (~72px from left),
          // extending 224px backwards = left-edge at ~-152px (clipped).
          // Sprint 7.25e fix (2026-05-15).
          className={`absolute z-50 ${isBelow ? "top-full mt-2" : "bottom-full mb-2"} start-0 w-56 ${className}`}
        >
          {/* Arrow pointing to target */}
          {isBelow && (
            <div className="absolute -top-1.5 start-5 w-3 h-3 rotate-45 bg-primary rounded-sm" />
          )}
          {!isBelow && (
            <div className="absolute -bottom-1.5 start-5 w-3 h-3 rotate-45 bg-primary rounded-sm" />
          )}

          <div className="bg-primary text-white rounded-2xl px-4 py-3 shadow-xl shadow-primary/30 flex flex-col gap-2">
            <p className="text-sm font-medium leading-snug">{text}</p>
            <button
              onClick={onDismiss}
              className="self-start text-xs font-semibold bg-white/20 hover:bg-white/30 active:scale-95 transition-all rounded-lg px-3 py-1"
            >
              הבנתי!
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
