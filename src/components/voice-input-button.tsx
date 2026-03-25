"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface VoiceInputButtonProps {
  /** Called with the final recognised text each time recognition ends with a result. */
  onTranscript: (text: string) => void;
  /** Extra CSS classes for the outer wrapper. */
  className?: string;
  /** BCP-47 locale passed to the hook. Defaults to he-IL. */
  lang?: string;
  /** Aria-label for the button (for screen readers). */
  ariaLabel?: string;
}

/**
 * Minimal microphone button that wraps useVoiceInput.
 *
 * - Idle:     grey mic icon
 * - Listening: indigo mic icon + animated pulse ring
 * - Error:    red mic icon, tooltip with message
 * - Unsupported: rendered with opacity-40 and cursor-not-allowed
 */
export function VoiceInputButton({
  onTranscript,
  className = "",
  lang = "he-IL",
  ariaLabel = "הקלטת קול",
}: VoiceInputButtonProps) {
  const { isListening, transcript, startListening, stopListening, isSupported, error } =
    useVoiceInput({ lang });

  // Fire onTranscript whenever we get a non-empty transcript
  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Animated pulse ring — visible only while listening */}
      <AnimatePresence>
        {isListening && (
          <motion.span
            key="pulse"
            className="absolute inset-0 rounded-full bg-indigo-400 pointer-events-none"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* The button itself */}
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={!isSupported}
        aria-label={isListening ? "עצור הקלטה" : ariaLabel}
        aria-pressed={isListening}
        title={error ?? (isListening ? "לחץ לעצור" : "לחץ להקלטה")}
        whileTap={isSupported ? { scale: 0.9 } : undefined}
        className={[
          "relative z-10 flex items-center justify-center",
          "w-10 h-10 rounded-full transition-colors duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          isListening
            ? "bg-indigo-600 text-white shadow-lg"
            : error
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          !isSupported ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <MicIcon isListening={isListening} />
      </motion.button>

      {/* Inline error hint below the button */}
      {error && !isListening && (
        <span
          className="absolute top-full mt-1 text-xs text-red-500 whitespace-nowrap"
          role="alert"
          dir="rtl"
        >
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal mic SVG — changes slightly between idle / listening states
// ---------------------------------------------------------------------------

function MicIcon({ isListening }: { isListening: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={isListening ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Mic body */}
      <rect x="9" y="2" width="6" height="12" rx="3" />
      {/* Mic stand arc */}
      <path d="M5 10a7 7 0 0 0 14 0" />
      {/* Vertical line */}
      <line x1="12" y1="19" x2="12" y2="22" />
      {/* Base */}
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
