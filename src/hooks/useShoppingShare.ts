"use client";

import { useCallback } from "react";
import type { ShoppingItem } from "@/hooks/useShoppingList";

// Category emoji map (matches SHOPPING_CATEGORY_ICONS + common Hebrew names)
const CATEGORY_EMOJI: Record<string, string> = {
  "ירקות": "🥬",
  "פירות": "🍎",
  "עשבי תיבול": "🌿",
  "מוצרי בסיס": "🌾",
  "מוצרי חלב": "🧀",
  "חלב": "🥛",
  "בשר/ביצים/דגים": "🥩",
  "בשר, ביצים ודגים": "🥩",
  "קטניות ותוספות": "🫘",
  "מאפים ודגנים": "🍞",
  "אגוזים": "🥜",
  "קפואים": "🧊",
  "שימורים": "🥫",
  "תבלינים": "🧂",
  "ממרחים": "🫙",
  "מטבלים ורטבים": "🍯",
  "משקאות": "🧃",
  "חטיפים ומתוקים": "🍫",
  "מצרכים לאפייה": "🧁",
  "ניקיון וכביסה": "🧹",
  "תרופות": "💊",
  "חיות מחמד": "🐾",
  "שונות": "📦",
  "מזון": "🛒",
  "ניקיון": "🧹",
  "חיות": "🐾",
  "בית": "🏠",
  "אחר": "📦",
  "טיפוח": "💄",
};

function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? "🛒";
}

export function useShoppingShare() {
  /**
   * Format unchecked shopping items grouped by category into a shareable text.
   */
  const formatShoppingList = useCallback((items: ShoppingItem[]): string => {
    const unchecked = items.filter((i) => !i.checked);
    if (unchecked.length === 0) return "";

    // Group by category
    const grouped: Record<string, ShoppingItem[]> = {};
    for (const item of unchecked) {
      const cat = item.category ?? "שונות";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    const lines: string[] = ["🛒 רשימת קניות", ""];

    for (const [category, catItems] of Object.entries(grouped)) {
      const emoji = getCategoryEmoji(category);
      lines.push(`${emoji} ${category}:`);
      for (const item of catItems) {
        const qty = item.quantity && item.quantity > 1
          ? ` (${item.quantity}${item.unit ? ` ${item.unit}` : ""})`
          : "";
        lines.push(`• ${item.title}${qty}`);
      }
      lines.push("");
    }

    return lines.join("\n").trimEnd();
  }, []);

  /**
   * Share via WhatsApp using the wa.me deep link.
   */
  const shareViaWhatsApp = useCallback((text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener,noreferrer");
  }, []);

  /**
   * Share using the native Web Share API (mobile-first).
   * Returns true if sharing was initiated, false if not supported.
   */
  const shareNative = useCallback(async (text: string): Promise<boolean> => {
    if (!navigator.share) return false;
    try {
      await navigator.share({
        title: "רשימת קניות",
        text,
      });
      return true;
    } catch {
      // User cancelled or share failed — treat as non-fatal
      return false;
    }
  }, []);

  /**
   * Copy text to clipboard. Returns true on success.
   */
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback: legacy execCommand
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        return success;
      } catch {
        return false;
      }
    }
  }, []);

  return { formatShoppingList, shareViaWhatsApp, shareNative, copyToClipboard };
}
