"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send } from "lucide-react";
import { VoiceInputButton } from "@/components/voice-input-button";
import { ChatMessage } from "./chat-message";
import { useAIChat } from "@/hooks/useAIChat";
import { useFocusTrap } from "@/hooks/useFocusTrap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// ChatDrawer
// ---------------------------------------------------------------------------

export function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const { messages, sendMessage, isTyping, quickActions } = useAIChat();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTrapRef = useFocusTrap<HTMLDivElement>(open, onClose);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, open]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      const timeout = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInputValue("");
  }, [inputValue, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      sendMessage(action);
    },
    [sendMessage],
  );

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage(text.trim());
      }
    },
    [sendMessage],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Drawer sheet */}
          <motion.div
            key="drawer"
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-label="העוזר החכם"
            dir="rtl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="fixed bottom-0 inset-x-0 z-50 flex flex-col bg-background rounded-t-3xl shadow-2xl"
            style={{ maxHeight: "85dvh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>העוזר החכם</span>
                <span aria-hidden="true">🤖</span>
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
              role="log"
              aria-live="polite"
              aria-label="היסטוריית שיחה"
            >
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  content={msg.content}
                  sender={msg.sender}
                  timestamp={msg.timestamp}
                />
              ))}

              {/* Typing indicator bubble */}
              {isTyping && (
                <ChatMessage
                  key="typing"
                  content=""
                  sender="ai"
                />
              )}

              {/* Invisible scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick action chips */}
            <div
              className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide"
              aria-label="פעולות מהירות"
            >
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleQuickAction(action)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full border border-primary/40 text-primary text-xs font-medium bg-primary/5 hover:bg-primary/10 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Input row */}
            <div className="px-4 pb-safe-bottom flex items-center gap-2 border-t border-border pt-3 pb-4">
              {/* Voice input */}
              <VoiceInputButton
                onTranscript={handleVoiceTranscript}
                className="flex-shrink-0"
                ariaLabel="הקלטה קולית"
              />

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="כתבו הודעה..."
                dir="rtl"
                aria-label="הודעה לעוזר"
                className="flex-1 bg-surface border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />

              {/* Send button */}
              <motion.button
                type="button"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                whileTap={{ scale: 0.9 }}
                aria-label="שלח הודעה"
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full gradient-primary text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Send size={16} />
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
