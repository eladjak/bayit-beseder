"use client";
import { useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCompletions } from "@/hooks/useCompletions";
import { runStarterSeed } from "@/lib/first-run-seed";

export const FIRST_TASK = { title: "לפתוח חלון", category: "general", estimatedMinutes: 0.5, recurring: true, frequency: "daily" };
const TASKS = [FIRST_TASK, { title: "סידור מהיר של הסלון", category: "living", estimatedMinutes: 5, recurring: true, frequency: "daily" }, { title: "ניקוי משטחי העבודה", category: "kitchen", estimatedMinutes: 5, recurring: true, frequency: "daily" }];
export function useFirstMinute() {
  const [step, setStep] = useState<"household"|"focus"|"ready"|"win"|"celebrate"|"invite">("household");
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
      const seed = await runStarterSeed(fetch, TASKS);
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
      setStep("celebrate");
    } catch { setError(true); } finally { setBusy(false); }
  }
  return { step, setStep, busy, error, focus, setFocus, prepare, complete, profile };
}
