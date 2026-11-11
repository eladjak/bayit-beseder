"use client";
import { useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCompletions } from "@/hooks/useCompletions";
import { runStarterSeed } from "@/lib/first-run-seed";

// A conservative Shabbat window avoids celebrations before sunset without location data.
export function isQuietTime(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  const day = parts.find(part => part.type === "weekday")?.value;
  const hour = Number(parts.find(part => part.type === "hour")?.value);
  return hour >= 22 || hour < 7 || day === "Sat" || (day === "Fri" && hour >= 15);
}
export const FIRST_TASK = { title: "לפתוח חלון", category: "general", estimatedMinutes: 0.5, recurring: true, frequency: "daily" };
const TASKS = [FIRST_TASK, { title: "סידור מהיר של הסלון", category: "living", estimatedMinutes: 5, recurring: true, frequency: "daily" }, { title: "ניקוי משטחי העבודה", category: "kitchen", estimatedMinutes: 5, recurring: true, frequency: "daily" }];
const FOCUS_TASKS: Record<string, typeof FIRST_TASK> = {
  "מטבח": { ...FIRST_TASK, title: "ניקוי משטחי העבודה", category: "kitchen", estimatedMinutes: 5 },
  "כביסה": { ...FIRST_TASK, title: "הפעלת מכונת כביסה", category: "laundry", estimatedMinutes: 5 },
  "סדר": { ...FIRST_TASK, title: "סידור מהיר של הסלון", category: "living", estimatedMinutes: 5 },
  "ניקיון": { ...FIRST_TASK, title: "ניגוב כיור האמבטיה", category: "bathroom", estimatedMinutes: 3 },
  "קניות": { ...FIRST_TASK, title: "בדיקת רשימת הקניות", category: "general", estimatedMinutes: 2 },
  "זמן ביחד": { ...FIRST_TASK, title: "לפנות זמן יחד", category: "general", estimatedMinutes: 5 },
};
export function useFirstMinute() {
  const [step, setStep] = useState<"household"|"focus"|"ready"|"win"|"celebrate"|"invite">(() => typeof window !== "undefined" && localStorage.getItem("bayit-beseder-onboarding-done") && localStorage.getItem("bayit-first-minute-invite") ? "invite" : "household");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const supabase = useSupabase();
  const { profile } = useProfile();
  const { markComplete } = useCompletions();
  async function prepare() {
    if (busy || !profile?.household_id) { if (!profile?.household_id) setError(true); return; }
    setBusy(true); setError(false);
    try {
      const selected = focus.map(item => FOCUS_TASKS[item]).filter(Boolean);
      const seed = await runStarterSeed(fetch, selected.length ? [FIRST_TASK, ...selected] : TASKS);
      if (!seed.ok) throw new Error("seed");
      const { data: existing, error: readError } = await supabase.from("shopping_items").select("id").eq("household_id", profile.household_id).limit(1);
      if (readError) throw readError;
      if (!existing?.length) {
        const { error: insertError } = await supabase.from("shopping_items").insert({ household_id: profile.household_id, title: "סבון כלים", category: "ניקיון", quantity: 1, added_by: profile.id });
        if (insertError) throw insertError;
      }
      const { data: tasks, error: taskError } = await supabase.from("tasks").select("id,title").eq("household_id", profile.household_id).eq("title", FIRST_TASK.title).limit(1);
      if (taskError || !tasks?.[0]) throw new Error("task missing");
      setTaskId(tasks[0].id);
      setStep("ready");
    } catch { setError(true); } finally { setBusy(false); }
  }
  async function complete() {
    if (!taskId || !profile || busy) return;
    setBusy(true); setError(false);
    try {
      const result = await markComplete({ taskId, userId: profile.id, householdId: profile.household_id ?? undefined, recurring: true });
      if (!result) throw new Error("completion");
      localStorage.setItem("bayit-beseder-onboarding-done", "true");
      localStorage.setItem("bayit-first-minute-invite", "1");
      setStep("celebrate");
    } catch { setError(true); } finally { setBusy(false); }
  }
  return { step, setStep, busy, error, focus, setFocus, prepare, complete, profile };
}
