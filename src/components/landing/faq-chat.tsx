"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Q&A data ─────────────────────────────────────────────────── */
interface FaqItem {
  id: string;
  q: string;
  a: string;
  followUps?: string[];
}

const FAQ_DATA: FaqItem[] = [
  {
    id: "free",
    q: "האם האפליקציה בחינם לגמרי?",
    a: "כן, בית בסדר חינמית לחלוטין. אין תשלום, אין מנוי, אין תכונות פרימיום נסתרות. פשוט נרשמים ומתחילים.",
    followUps: ["האם צריך להוריד אפליקציה?", "איך עובד שיתוף עם הפרטנר?"],
  },
  {
    id: "pwa",
    q: "האם צריך להוריד אפליקציה מהחנות?",
    a: "לא! בית בסדר עובדת ישר מהדפדפן. אפשר גם להוסיף לדף הבית (PWA) ולקבל חוויה כמו אפליקציה אמיתית — בלי להוריד כלום.",
    followUps: ["האם האפליקציה בחינם?", "מה עם פרטיות?"],
  },
  {
    id: "sharing",
    q: "איך עובד שיתוף הבית עם הפרטנר/ית?",
    a: "אחרי ההרשמה שולחים הזמנה בוואטסאפ בלחיצה אחת. כשהפרטנר/ית מצטרף/ת — הכל מסונכרן בזמן אמת: משימות, קניות, נקודות.",
    followUps: ["האם זה עובד למשפחות עם ילדים?", "מה עם פרטיות?"],
  },
  {
    id: "privacy",
    q: "מה עם פרטיות? המידע שלנו בטוח?",
    a: "המידע שלכם מאובטח ב-Supabase עם הצפנה מלאה. אנחנו לא מוכרים מידע ולא מפרסמים. רק אתם ושותפכם רואים את הנתונים.",
    followUps: ["האם האפליקציה בחינם?", "איך עובד שיתוף עם הפרטנר?"],
  },
  {
    id: "family",
    q: "האם זה עובד גם למשפחות עם ילדים, ולא רק לזוגות?",
    a: "בהחלט! בית בסדר בנוי לכל סוג בית — זוגות, משפחות עם ילדים, שותפים לדירה וגם מי שגר לבד. בהרשמה בוחרים את סוג הבית והאפליקציה מתאימה את עצמה, כולל מצב ידידותי לילדים. כל אחד בבית רואה את חלקו ותורם.",
    followUps: ["האם האפליקציה בחינם?", "האם צריך להוריד אפליקציה?"],
  },
];

/* Map short label → full question for follow-up chips */
const SHORT_TO_FAQ: Record<string, FaqItem> = {
  "האם האפליקציה בחינם?": FAQ_DATA[0],
  "האם צריך להוריד אפליקציה?": FAQ_DATA[1],
  "איך עובד שיתוף עם הפרטנר?": FAQ_DATA[2],
  "מה עם פרטיות?": FAQ_DATA[3],
  "האם זה עובד למשפחות עם ילדים?": FAQ_DATA[4],
};

/* ── Types ────────────────────────────────────────────────────── */
interface Message {
  id: string;
  type: "user" | "bot";
  text: string;
  followUps?: string[];
  streaming?: boolean;
}

interface HistoryMessage {
  role: "user" | "model";
  content: string;
}

/* ── TypingDots ───────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.7,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── BotBubble ────────────────────────────────────────────────── */
interface BotBubbleProps {
  message: Message;
  onFollowUp: (label: string) => void;
  isLast: boolean;
}

function BotBubble({ message, onFollowUp, isLast }: BotBubbleProps) {
  return (
    <div className="flex items-end gap-2">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0 shadow-sm">
        🏠
      </div>

      <div className="flex flex-col gap-2 max-w-[80%]">
        {/* Bubble */}
        <motion.div
          initial={{ opacity: 0, x: -12, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-surface border border-border rounded-2xl rounded-br-lg rounded-bl-sm px-4 py-3 text-sm text-foreground leading-relaxed shadow-sm"
        >
          {message.text}
        </motion.div>

        {/* Follow-up chips */}
        {isLast && message.followUps && message.followUps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.2 }}
            className="flex flex-wrap gap-2"
          >
            {message.followUps.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => onFollowUp(label)}
                className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary-ink font-medium hover:bg-primary/15 transition-colors active:scale-95"
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── UserBubble ───────────────────────────────────────────────── */
function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-start">
      {/* RTL: "user is on the right" in visual space = flex-row-reverse */}
      <motion.div
        initial={{ opacity: 0, x: 12, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tl-lg rounded-bl-sm text-sm font-medium text-white shadow-sm"
        style={{
          background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
        }}
      >
        {text}
      </motion.div>
    </div>
  );
}

/* ── Main FaqChat component ───────────────────────────────────── */
export function FaqChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-scroll within chat container (not the page) */
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  /* Initial greeting from bot */
  useEffect(() => {
    const greeting: Message = {
      id: "greeting",
      type: "bot",
      text: "שלום! אני כאן לענות על כל שאלה שיש לכם על בית בסדר. בחרו שאלה או כתבו בחופשיות:",
      followUps: FAQ_DATA.slice(0, 3).map((f) => f.q),
    };
    const timer = setTimeout(() => setMessages([greeting]), 400);
    return () => clearTimeout(timer);
  }, []);

  /* Ask Gemini for a free-text question */
  const askGemini = useCallback(async (questionText: string) => {
    setIsStreaming(true);

    const botMsgId = `b-ai-${Date.now()}`;
    const streamingMsg: Message = {
      id: botMsgId,
      type: "bot",
      text: "",
      streaming: true,
    };
    setMessages((prev) => [...prev, streamingMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: questionText, history }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "שגיאה לא ידועה" })) as { error?: string };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? { ...m, text: err.error ?? "שגיאה בקבלת תשובה. נסו שוב.", streaming: false }
              : m
          )
        );
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, text: fullText } : m
          )
        );
      }

      /* Finalise: remove streaming flag, add follow-up chips */
      const suggestedFollowUps = FAQ_DATA.filter((f) => !askedIds.has(f.id))
        .slice(0, 2)
        .map((f) => f.q);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, streaming: false, followUps: suggestedFollowUps }
            : m
        )
      );

      /* Update history for multi-turn context */
      setHistory((prev) => [
        ...prev,
        { role: "user", content: questionText },
        { role: "model", content: fullText },
      ]);
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, text: "שגיאת תקשורת. בדקו את החיבור ונסו שוב.", streaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [history, askedIds]);

  const handleQuestion = useCallback((questionText: string) => {
    /* Find the FAQ item — either by exact q match or short label */
    const faqItem =
      FAQ_DATA.find((f) => f.q === questionText) ??
      SHORT_TO_FAQ[questionText] ??
      null;

    /* Add user bubble */
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      type: "user",
      text: questionText,
    };

    setMessages((prev) => {
      /* Strip follow-up chips from the previous last bot message */
      const updated = prev.map((m, idx) =>
        idx === prev.length - 1 && m.type === "bot"
          ? { ...m, followUps: [] }
          : m
      );
      return [...updated, userMsg];
    });

    /* If no FAQ match — send to Gemini */
    if (!faqItem) {
      void askGemini(questionText);
      return;
    }

    /* Static FAQ answer */
    const alreadyAsked = askedIds.has(faqItem.id);
    setAskedIds((prev) => new Set(prev).add(faqItem.id));

    setIsTyping(true);
    const delay = alreadyAsked ? 400 : 700 + Math.random() * 200;
    setTimeout(() => {
      setIsTyping(false);

      const freshFollowUps = (faqItem.followUps ?? []).filter((label) => {
        const linked = SHORT_TO_FAQ[label] ?? FAQ_DATA.find((f) => f.q === label);
        return linked ? !askedIds.has(linked.id) : true;
      });

      const botMsg: Message = {
        id: `b-${Date.now()}`,
        type: "bot",
        text: faqItem.a,
        followUps:
          freshFollowUps.length > 0
            ? freshFollowUps
            : FAQ_DATA.filter((f) => !askedIds.has(f.id) && f.id !== faqItem.id)
                .slice(0, 2)
                .map((f) => f.q),
      };

      setMessages((prev) => [...prev, botMsg]);

      /* Keep history for Gemini context */
      setHistory((prev) => [
        ...prev,
        { role: "user", content: questionText },
        { role: "model", content: faqItem.a },
      ]);
    }, delay);
  }, [askedIds, askGemini]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping || isStreaming) return;
    setInputValue("");
    handleQuestion(trimmed);
  };

  /* Question chips shown before conversation starts */
  const showInitialChips = messages.length === 0;
  const isBusy = isTyping || isStreaming;

  return (
    <section className="max-w-3xl mx-auto px-4 py-16" dir="rtl">
      {/* Section header */}
      <motion.h2
        initial={{ opacity: 0, y: -8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-2xl font-bold text-center text-foreground mb-2"
      >
        שאלות נפוצות
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.12 }}
        className="text-center text-muted text-sm mb-8"
      >
        כל מה שרציתם לדעת ולא העזתם לשאול
      </motion.p>

      {/* Chat window */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="bg-surface border border-border rounded-3xl shadow-xl overflow-hidden"
        style={{ minHeight: 360 }}
      >
        {/* Chat header bar */}
        <div
          className="px-5 py-3 flex items-center gap-3 border-b border-border"
          style={{
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
          }}
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-base">
            🏠
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">בית בסדר</p>
            <p className="text-white/70 text-xs">
              {isStreaming ? "מקליד..." : "מענה מיידי לשאלות"}
            </p>
          </div>
          {/* Traffic lights decoration */}
          <div className="flex gap-1.5 ms-auto opacity-60">
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={chatContainerRef}
          className="flex flex-col gap-4 px-4 py-5 overflow-y-auto scroll-smooth"
          style={{ maxHeight: 420, direction: "rtl" }}
        >
          {showInitialChips && (
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {FAQ_DATA.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleQuestion(f.q)}
                  className="text-sm px-4 py-2 rounded-full border border-border bg-background text-foreground hover:border-primary hover:text-primary transition-colors active:scale-95 shadow-sm"
                >
                  {f.q}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1;
              if (msg.type === "user") {
                return <UserBubble key={msg.id} text={msg.text} />;
              }
              return (
                <BotBubble
                  key={msg.id}
                  message={msg}
                  onFollowUp={handleQuestion}
                  isLast={isLast && !isBusy}
                />
              );
            })}
          </AnimatePresence>

          {/* Typing indicator — only for static FAQ delay */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="flex items-end gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">
                  🏠
                </div>
                <div className="bg-surface border border-border rounded-2xl rounded-bl-sm shadow-sm">
                  <TypingDots />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border px-4 py-3 bg-background/50 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="שאלו כל שאלה על בית בסדר..."
            aria-label="שאלו כל שאלה על בית בסדר"
            disabled={isBusy}
            dir="rtl"
            className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isBusy}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-opacity flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            aria-label="שלח שאלה"
          >
            {isStreaming ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </form>
      </motion.div>
    </section>
  );
}
