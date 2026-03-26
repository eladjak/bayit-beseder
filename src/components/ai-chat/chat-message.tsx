"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessageProps {
  content: string;
  sender: "ai" | "user";
  timestamp?: string;
}

// ---------------------------------------------------------------------------
// Typing indicator — three animated dots
// ---------------------------------------------------------------------------

function TypingDots() {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-[3px] h-4" aria-label={t("aiChat.typingLabel")}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[6px] h-[6px] rounded-full bg-muted inline-block"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ChatMessage
// ---------------------------------------------------------------------------

export function ChatMessage({ content, sender, timestamp }: ChatMessageProps) {
  const isAI = sender === "ai";
  const isEmpty = !content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex w-full ${isAI ? "justify-start" : "justify-end"}`}
      dir="rtl"
    >
      <div
        className={[
          "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
          isAI
            ? "bg-surface text-foreground rounded-tr-sm border border-border"
            : "gradient-primary text-white rounded-tl-sm",
        ].join(" ")}
      >
        {/* Content or typing indicator */}
        {isEmpty && isAI ? <TypingDots /> : <p className="whitespace-pre-wrap break-words">{content}</p>}

        {/* Timestamp */}
        {timestamp && !isEmpty && (
          <span
            className={`block text-[10px] mt-1 ${
              isAI ? "text-muted text-right" : "text-white/70 text-left"
            }`}
          >
            {timestamp}
          </span>
        )}
      </div>
    </motion.div>
  );
}
