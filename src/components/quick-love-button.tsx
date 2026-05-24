"use client";

/**
 * Quick Love Button (FAB) — Alopik v2 #1.
 *
 * Floating action button. Tap → opens sheet with 1/3/5/10 preset values
 * + custom input + recipient selector + optional message.
 *
 * Rate-limited: 6 sends per recipient per day (Asia/Jerusalem).
 * Bidirectional — every household member can send + receive.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md (commit b0f7561)
 */

import { useEffect, useState, useTransition } from "react";
import { Heart, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import {
  sendLoveToken,
  getRemainingSendsToday,
  PRESET_VALUES,
  MAX_VALUE,
  MAX_MESSAGE_LEN,
  DAILY_SEND_LIMIT,
} from "@/lib/love-tokens";
import { playHeartPop } from "@/lib/sound-effects";
import { tryHaptic } from "@/lib/ux-preferences";
import { copy } from "@/lib/copy-resolver";

type HouseholdMember = {
  readonly id: string;
  readonly name: string;
  readonly emoji: string | null;
};

export function QuickLoveButton() {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<readonly HouseholdMember[]>([]);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<number>(3);
  const [customValue, setCustomValue] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [remaining, setRemaining] = useState<number>(DAILY_SEND_LIMIT);
  const [pending, startTransition] = useTransition();

  // Load other household members when sheet opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", userData.user.id)
        .single();
      if (!profile?.household_id) return;
      const { data: others } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("household_id", profile.household_id)
        .neq("id", userData.user.id);
      if (cancelled) return;
      const list = (others ?? []).map((p): HouseholdMember => ({
        id: p.id,
        name: p.display_name ?? "השותף",
        emoji: null,
      }));
      setMembers(list);
      if (list.length > 0 && !recipientId) setRecipientId(list[0].id);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, recipientId]);

  // Refresh remaining-sends when recipient changes
  useEffect(() => {
    if (!open || !recipientId) return;
    void getRemainingSendsToday(recipientId).then(setRemaining);
  }, [open, recipientId]);

  const handleSend = () => {
    if (!recipientId) return;
    const valueToSend = customValue
      ? parseInt(customValue, 10)
      : selectedValue;
    if (!Number.isFinite(valueToSend) || valueToSend <= 0 || valueToSend > MAX_VALUE) {
      toast.error(`ערך חייב להיות בין 1 ל-${MAX_VALUE}`);
      return;
    }
    startTransition(async () => {
      const result = await sendLoveToken({
        recipientId,
        value: valueToSend,
        message: message.trim() || undefined,
      });
      if (result.ok) {
        playHeartPop();
        tryHaptic([10, 30, 10]);
        toast.success(`💖 ${valueToSend} לבבות נשלחו!`);
        setOpen(false);
        setMessage("");
        setCustomValue("");
        setSelectedValue(3);
      } else {
        if (result.error === "RATE_LIMIT_EXCEEDED") {
          toast.error(`הגעת למכסת היום (${DAILY_SEND_LIMIT}). מחר אפשר שוב 🌅`);
        } else {
          toast.error("שגיאה בשליחה — נסה שוב");
        }
      }
    });
  };

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={copy("quickLoveAria")}
        className="alopik-brand-gradient fixed bottom-24 end-4 z-40 size-14 rounded-full text-white shadow-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
      >
        <Heart className="size-6" fill="currentColor" aria-hidden="true" />
      </button>

      {/* Sheet */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qlb-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="alopik-settle w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 id="qlb-title" className="text-lg font-bold text-indigo-700">
                💖 שלח לב
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגור"
                className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                אין שותפים נוספים במשק הבית עדיין
              </p>
            ) : (
              <>
                {members.length > 1 && (
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 mb-1 block">למי?</label>
                    <div className="flex gap-2">
                      {members.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setRecipientId(m.id)}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                            recipientId === m.id
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-gray-200"
                          }`}
                        >
                          {m.emoji ?? "👤"} {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs text-gray-600 mb-1 block">כמה לבבות?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_VALUES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setSelectedValue(v);
                          setCustomValue("");
                        }}
                        className={`py-2 rounded-lg border tabular-nums text-sm ${
                          selectedValue === v && !customValue
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-gray-200"
                        }`}
                      >
                        {v} 💖
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_VALUE}
                    placeholder={`או הקלד/י (1-${MAX_VALUE})`}
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm tabular-nums"
                  />
                </div>

                <div className="mb-3">
                  <label className="text-xs text-gray-600 mb-1 block">
                    הודעה (אופציונלי, עד {MAX_MESSAGE_LEN} תווים)
                  </label>
                  <input
                    type="text"
                    maxLength={MAX_MESSAGE_LEN}
                    placeholder="למשל: תודה על הקפה הבוקר ☕"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={pending || !recipientId || remaining === 0}
                  className="w-full py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200"
                >
                  {pending ? "שולח..." : "💖 שלח עכשיו"}
                </button>

                <p className="text-[11px] text-gray-500 mt-2 text-center tabular-nums">
                  נותרו {remaining}/{DAILY_SEND_LIMIT} שליחות היום (מתאפס במחר)
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
