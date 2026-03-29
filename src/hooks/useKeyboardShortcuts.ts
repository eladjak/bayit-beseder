"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface ShortcutConfig {
  /** Called when Ctrl/Cmd+N is pressed — new task */
  onNewTask?: () => void;
  /** Called when Ctrl/Cmd+/ is pressed — open AI chat */
  onOpenAIChat?: () => void;
  /** Called when Escape is pressed — close modal/drawer */
  onEscape?: () => void;
  /** Called when ? is pressed — show shortcuts help */
  onShowHelp?: () => void;
}

function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  // Check for fine pointer (mouse) — mobile devices typically use coarse pointer
  return window.matchMedia("(pointer: fine)").matches;
}

function isInputFocused(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).contentEditable === "true"
  );
}

/**
 * useKeyboardShortcuts — registers global keyboard shortcuts for desktop users.
 *
 * Active shortcuts:
 * - Ctrl/Cmd+N → new task (navigates to /tasks, triggers onNewTask)
 * - Ctrl/Cmd+/ → open AI chat (triggers onOpenAIChat)
 * - Escape → close any open modal/drawer (triggers onEscape)
 * - ? → show shortcuts help modal (triggers onShowHelp)
 *
 * Only active on desktop (pointer: fine media query).
 */
export function useKeyboardShortcuts(config: ShortcutConfig = {}) {
  const router = useRouter();
  const { onNewTask, onOpenAIChat, onEscape, onShowHelp } = config;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isDesktop()) return;

      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+N — new task
      if (isMod && e.key === "n") {
        e.preventDefault();
        if (onNewTask) {
          onNewTask();
        } else {
          router.push("/tasks");
        }
        return;
      }

      // Ctrl/Cmd+/ — open AI chat
      if (isMod && e.key === "/") {
        e.preventDefault();
        onOpenAIChat?.();
        return;
      }

      // Escape — close modal/drawer
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }

      // ? — show shortcuts help (only when no input is focused)
      if (e.key === "?" && !isInputFocused() && !isMod) {
        e.preventDefault();
        onShowHelp?.();
        return;
      }
    },
    [router, onNewTask, onOpenAIChat, onEscape, onShowHelp]
  );

  useEffect(() => {
    if (!isDesktop()) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/** The list of available shortcuts for the help modal */
export const KEYBOARD_SHORTCUTS = [
  {
    keys: ["Ctrl", "N"],
    macKeys: ["⌘", "N"],
    descriptionKey: "shortcuts.newTask",
    description: "משימה חדשה",
  },
  {
    keys: ["Ctrl", "/"],
    macKeys: ["⌘", "/"],
    descriptionKey: "shortcuts.openAIChat",
    description: "פתיחת שיחת AI",
  },
  {
    keys: ["Esc"],
    macKeys: ["Esc"],
    descriptionKey: "shortcuts.closeModal",
    description: "סגירת חלון פעיל",
  },
  {
    keys: ["?"],
    macKeys: ["?"],
    descriptionKey: "shortcuts.showHelp",
    description: "הצגת קיצורי מקלדת",
  },
] as const;
