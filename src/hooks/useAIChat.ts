"use client";

import { useState, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  content: string;
  sender: "ai" | "user";
  timestamp: string;
}

export interface UseAIChatResult {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isTyping: boolean;
  quickActions: string[];
}

// ---------------------------------------------------------------------------
// Quick actions (Hebrew)
// ---------------------------------------------------------------------------

export const QUICK_ACTIONS = ["תכנן את השבוע", "שנה חלוקה", "יום קל", "תן לי טיפ"];

// ---------------------------------------------------------------------------
// Pre-programmed local response logic
// ---------------------------------------------------------------------------

const CLEANING_TIPS = [
  "טיפ: כאשר מנקים את חדר האמבטיה, התחילו מלמעלה למטה — קודם הראי והמדפים, אחר כך הכיור, ולבסוף הרצפה.",
  "טיפ: כוס חומץ לבן + כפית סודה לשתייה מנקים ומחטאים משטחי מטבח בצורה נהדרת — ובלי כימיקלים קשים!",
  "טיפ: מגבות מיקרופייבר לחות מסירות 99% מהחיידקים מהמשטחים — הכי טוב ללא ספריי.",
  "טיפ: ניקוי של 10 דקות בכל יום עדיף הרבה יותר מניקוי גדול אחת לשבוע.",
  "טיפ: הכינו 'ריצת ניקיון' — כל בן בית לוקח חפץ שלא במקומו ומחזיר אותו. 5 דקות, כל הבית מסודר!",
  "טיפ: ג'ל אסלה ב-5 דקות לפני שינה — למחרת האסלה זוהרת בלי שפשוף.",
];

function getRandomTip(): string {
  return CLEANING_TIPS[Math.floor(Math.random() * CLEANING_TIPS.length)];
}

function generateLocalResponse(userText: string): string {
  const lower = userText.toLowerCase();

  if (lower.includes("שבוע") || lower.includes("תכנון") || lower.includes("תכנן")) {
    return "בשמחה! אני ממליץ לחלק את המשימות לפי אזורי הבית: יום ראשון — מטבח, יום שלישי — חדרי שינה, יום חמישי — סלון ושירותים. רוצים שאיצור לכם תוכנית שבועית שלמה?";
  }

  if (lower.includes("קל") || lower.includes("עייף") || lower.includes("יום קל")) {
    return "מובן, זה בסדר לחלוטין! ביום כזה מספיק לשמור על הבסיס: שטיפת כלים, ניגוב המשטחים, וקיפול מהיר. שאר המשימות יכולות לחכות ליום הבא 💙";
  }

  if (lower.includes("טיפ") || lower.includes("tip")) {
    return getRandomTip();
  }

  if (
    lower.includes("חלוקה") ||
    lower.includes("איזון") ||
    lower.includes("שנה חלוקה") ||
    lower.includes("חלק")
  ) {
    return "חלוקה הוגנת היא המפתח! אני יכול לנתח את המשימות הנוכחיות ולהציע חלוקה מאוזנת. בדרך כלל כדאי לחלק לפי זמן ניקוי ולא לפי כמות משימות — כך כל אחד משקיע בערך אותו זמן.";
  }

  return "אני כאן לעזור! נסו לשאול על תכנון השבוע, טיפים לניקוי, או חלוקת משימות בין בני הבית 😊";
}

// ---------------------------------------------------------------------------
// Welcome message
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  content: "שלום! אני העוזר החכם של הבית 🏠 אני יכול לעזור לכם לתכנן את השבוע, לחלק משימות, ולתת טיפים לניקוי. במה אוכל לסייע?",
  sender: "ai",
  timestamp: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAIChat(): UseAIChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const idCounterRef = useRef(1);

  const nextId = useCallback(() => {
    idCounterRef.current += 1;
    return `msg-${idCounterRef.current}`;
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const timestamp = new Date().toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Add user message immediately
      const userMsg: ChatMessage = {
        id: nextId(),
        content: trimmed,
        sender: "user",
        timestamp,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      // Simulate AI typing delay (800–1500ms)
      const delay = 800 + Math.random() * 700;

      setTimeout(() => {
        const responseText = generateLocalResponse(trimmed);

        const aiMsg: ChatMessage = {
          id: nextId(),
          content: responseText,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
      }, delay);
    },
    [nextId],
  );

  return {
    messages,
    sendMessage,
    isTyping,
    quickActions: QUICK_ACTIONS,
  };
}
