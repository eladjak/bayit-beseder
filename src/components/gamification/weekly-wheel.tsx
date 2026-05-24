"use client";

/**
 * Weekly Wheel of Fortune component — Alopik v2 Phase 2.
 *
 * Friday-Sat playable. Single spin per household per ISO week.
 * Animated wheel + reveal + redeem flow.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md (#5)
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  SEGMENTS,
  getOrSpin,
  isWheelAvailableTime,
  redeemSpin,
  type WheelSegment,
} from "@/lib/weekly-wheel";

type State =
  | { kind: "idle" }
  | { kind: "spinning" }
  | { kind: "result"; segment: WheelSegment; spinId: string; alreadySpun: boolean }
  | { kind: "redeemed"; segment: WheelSegment };

export function WeeklyWheel() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const [availableNow, setAvailableNow] = useState(false);

  useEffect(() => {
    setAvailableNow(isWheelAvailableTime());
    const id = setInterval(() => setAvailableNow(isWheelAvailableTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Segment angles for the wheel display
  const segmentAngles = useMemo(() => {
    const angle = 360 / SEGMENTS.length;
    return SEGMENTS.map((s, i) => ({ segment: s, startDeg: angle * i, midDeg: angle * i + angle / 2 }));
  }, []);

  const handleSpin = () => {
    setState({ kind: "spinning" });
    startTransition(async () => {
      // Visual spin animation (1.8s)
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const result = await getOrSpin();
      if (!result.ok) {
        toast.error(
          result.error === "NOT_AVAILABLE_YET"
            ? "הגלגל פתוח רק מיום שישי 14:00 ועד שבת בלילה 🌅"
            : "שגיאה בהפעלת הגלגל"
        );
        setState({ kind: "idle" });
        setOpen(false);
        return;
      }
      setState({
        kind: "result",
        segment: result.segment,
        spinId: result.spinId,
        alreadySpun: result.alreadySpun,
      });
    });
  };

  const handleRedeem = (spinId: string, segment: WheelSegment) => {
    startTransition(async () => {
      const r = await redeemSpin(spinId);
      if (!r.ok) {
        toast.error("לא הצלחנו לרשום מימוש — נסו שוב");
        return;
      }
      toast.success("נרשם! עכשיו תקיימו את זה 💖");
      setState({ kind: "redeemed", segment });
    });
  };

  if (!availableNow && state.kind === "idle") return null;

  return (
    <>
      {/* Entry FAB — only Fri 14:00 → Sat night */}
      {state.kind === "idle" && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            handleSpin();
          }}
          aria-label="פתח את גלגל המזל השבועי"
          className="fixed bottom-64 end-4 z-40 size-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-amber-500 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300"
        >
          <span aria-hidden="true" className="text-2xl">🎡</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ww-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setState({ kind: "idle" });
                }}
                aria-label="סגור"
                className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="px-6 pb-6 text-center">
              <h2 id="ww-title" className="text-xl font-bold text-gray-900 mb-1 text-balance">
                גלגל המזל השבועי
              </h2>
              <p className="text-xs text-gray-500 mb-4">פעם בשבוע. ביחד.</p>

              {/* Wheel visual */}
              <div className="relative mx-auto size-64 mb-5">
                <div
                  className="size-full rounded-full border-4 border-amber-300 shadow-inner relative overflow-hidden"
                  style={{
                    transition: "transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)",
                    transform:
                      state.kind === "spinning"
                        ? `rotate(${1080 + Math.random() * 360}deg)`
                        : state.kind === "result" || state.kind === "redeemed"
                          ? `rotate(${360 - segmentAngles.find((sa) => sa.segment.id === ("segment" in state ? state.segment.id : ""))!.midDeg}deg)`
                          : "rotate(0deg)",
                  }}
                >
                  {segmentAngles.map(({ segment, startDeg }, i) => (
                    <div
                      key={segment.id}
                      className="absolute inset-0"
                      style={{
                        transform: `rotate(${startDeg}deg)`,
                        transformOrigin: "50% 50%",
                      }}
                    >
                      <div
                        className="absolute left-1/2 top-0 -translate-x-1/2 w-px h-1/2"
                        style={{
                          background: i % 2 === 0 ? "rgba(244,114,182,0.7)" : "rgba(252,211,77,0.7)",
                        }}
                      />
                      <div
                        className="absolute left-1/2 -translate-x-1/2 text-xl"
                        style={{ top: "12%" }}
                        aria-hidden="true"
                      >
                        {segment.emoji}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Center pointer */}
                <div
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 size-0 border-x-8 border-x-transparent border-t-[14px] border-t-rose-600 z-10"
                  aria-hidden="true"
                />
                {/* Spin badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="size-16 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center shadow-lg">
                    <Sparkles className="size-6 text-amber-500" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {state.kind === "spinning" && (
                <p className="text-sm text-rose-600 font-medium animate-pulse">מסתובב...</p>
              )}

              {(state.kind === "result" || state.kind === "redeemed") && (
                <>
                  <div className="bg-amber-50 rounded-lg p-4 mb-4 border border-amber-200">
                    <div className="text-4xl mb-2" aria-hidden="true">{state.segment.emoji}</div>
                    <p className="text-lg font-bold text-amber-900">{state.segment.label}</p>
                    {state.segment.description && (
                      <p className="text-xs text-amber-700 mt-1">{state.segment.description}</p>
                    )}
                    {"alreadySpun" in state && state.alreadySpun && (
                      <p className="text-[11px] text-amber-600 mt-2">
                        כבר סובבתם השבוע. זה מה שיצא.
                      </p>
                    )}
                  </div>

                  {state.kind === "result" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRedeem(state.spinId, state.segment)}
                        disabled={pending}
                        className="flex-1 py-3 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 disabled:opacity-50 transition-colors duration-200"
                      >
                        סמן כממומש
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          setState({ kind: "idle" });
                        }}
                        className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                      >
                        שמור להמשך השבוע
                      </button>
                    </div>
                  )}

                  {state.kind === "redeemed" && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setState({ kind: "idle" });
                      }}
                      className="w-full py-3 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors duration-200"
                    >
                      סגור 💖
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
