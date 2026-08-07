"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Shield, Check, Clock, Loader2, AlertTriangle } from "lucide-react";
import { getCategoryColor, getCategoryLabel } from "@/lib/seed-data";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { isTaskOverdue } from "@/lib/task-flags";

interface EmergencyTask {
  id: string;
  title: string;
  category: string;
  estimated_minutes: number;
  due_date: string | null;
  status: string | null;
  /** Live column is `text` ("true"/"false") — read via isRecurring, never `!!`. */
  recurring: unknown;
}

// Emergency mode state is stored in localStorage since the households table
// does not have an emergency_mode column in the production schema.
const EMERGENCY_MODE_KEY = "bayit-beseder-emergency-mode";

function getStoredEmergencyMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(EMERGENCY_MODE_KEY) === "true";
}

function setStoredEmergencyMode(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMERGENCY_MODE_KEY, String(value));
}

export default function EmergencyPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<EmergencyTask[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [togglingEmergency, setTogglingEmergency] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Restore emergency mode from localStorage
    setEmergencyMode(getStoredEmergencyMode());

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch today's and overdue pending tasks from the tasks table
      const today = new Date().toISOString().slice(0, 10);
      const { data: pendingTasks } = await supabase
        .from("tasks")
        .select("id, title, category_id, due_date, status, points, recurring")
        .lte("due_date", today)
        .eq("status", "pending")
        .order("due_date", { ascending: true });

      if (pendingTasks && pendingTasks.length > 0) {
        // In emergency mode, show all pending + overdue tasks as essential
        const emergencyTasks: EmergencyTask[] = pendingTasks.map((task) => ({
          id: task.id,
          title: task.title,
          category: task.category_id ?? "general",
          estimated_minutes: (task.points ?? 10) <= 5 ? 5 : (task.points ?? 10) <= 15 ? 15 : 30,
          due_date: task.due_date,
          status: task.status,
          recurring: (task as { recurring?: unknown }).recurring,
        }));
        setTasks(emergencyTasks);
      }
    } catch {
      // Graceful fallback - no data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const completedCount = completedIds.size;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  async function toggleTask(taskId: string) {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });

    // Mark as completed in DB
    const isNowCompleted = !completedIds.has(taskId);
    if (isNowCompleted) {
      try {
        const supabase = createClient();
        await supabase
          .from("tasks")
          .update({ status: "completed" })
          .eq("id", taskId);
      } catch {
        // Silently ignore - optimistic update still works
      }
    } else {
      // Undo completion
      try {
        const supabase = createClient();
        await supabase
          .from("tasks")
          .update({ status: "pending" })
          .eq("id", taskId);
      } catch {
        // Silently ignore
      }
    }
  }

  function toggleEmergencyMode() {
    setTogglingEmergency(true);
    const newMode = !emergencyMode;
    setEmergencyMode(newMode);
    setStoredEmergencyMode(newMode);
    toast.success(newMode ? "מצב חירום הופעל" : "חזרנו לשגרה");
    setTogglingEmergency(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4 pb-28" dir="rtl">
      {/* Header Banner */}
      <motion.div
        className={`border rounded-2xl overflow-hidden text-center ${
          emergencyMode
            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50"
            : "bg-surface dark:bg-surface border-border"
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Image
          src="/illustrations/emergency-mode.jpg"
          alt="מצב חירום"
          width={512}
          height={144}
          sizes="(max-width: 512px) 100vw, 512px"
          className="w-full h-36 object-cover"
        />
        <div className="p-4">
        {emergencyMode ? (
          <>
            <Shield className="w-8 h-8 text-blue-500 dark:text-blue-400 mx-auto mb-2" />
            <h1 className="text-lg font-bold text-blue-700 dark:text-blue-300">🛡️ {t("emergency.activeTitle")}</h1>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              רק הבסיס. צעד אחד בכל פעם. הכל יסתדר 💙
            </p>
          </>
        ) : (
          <>
            <AlertTriangle className="w-8 h-8 text-muted mx-auto mb-2" />
            <h1 className="text-lg font-bold text-foreground">⚡ {t("emergency.title")}</h1>
            <p className="text-sm text-muted mt-1">
              כשהכל על הראש — מתמקדים רק בחיוני
            </p>
          </>
        )}

        <button
          onClick={toggleEmergencyMode}
          disabled={togglingEmergency}
          aria-label={emergencyMode ? t("emergency.deactivateButton") : t("emergency.activateButton")}
          className={`mt-3 px-5 py-2 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50 ${
            emergencyMode
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "border border-border text-muted hover:bg-surface-hover"
          }`}
        >
          {togglingEmergency ? (
            <Loader2 className="w-4 h-4 animate-spin inline" />
          ) : emergencyMode ? (
            `${t("emergency.deactivateButton")} ✓`
          ) : (
            `⚡ ${t("emergency.activateButton")}`
          )}
        </button>
        </div>
      </motion.div>

      {emergencyMode && (
        <>
          {/* Simplified Progress */}
          <div className="card-elevated p-4 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {completedCount}/{totalCount}
            </div>
            <p className="text-sm text-muted">{t("emergency.completedFromList")}</p>
            <div className="h-2 bg-blue-100 dark:bg-blue-900/40 rounded-full mt-3 overflow-hidden">
              <motion.div
                className="h-full w-full bg-blue-500 rounded-full bb-bar"
                animate={{ scaleX: percentage / 100 }}
                initial={{ scaleX: 0 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted mt-2">{t("emergency.goal")}</p>
          </div>

          {/* Coaching Message */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-xl">🫂</span>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              תקופה קשה? בסדר גמור. רק הבסיס, בלי לחץ.
            </p>
          </div>

          {/* Emergency Tasks */}
          <div className="space-y-2">
            <h2 className="font-semibold text-sm text-foreground px-1">
              {t("emergency.essentialOnly")} {tasks.length === 0 && "— אין פתוחות, כל הכבוד! 🎉"}
            </h2>
            {tasks.map((task: EmergencyTask, i: number) => {
              const isCompleted = completedIds.has(task.id);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`card-elevated p-3 flex items-center gap-3 ${
                    isCompleted ? "opacity-60" : ""
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isCompleted
                        ? "bg-blue-500 border-blue-500"
                        : "border-blue-300 hover:border-blue-500"
                    }`}
                  >
                    {isCompleted && (
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    )}
                  </button>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted
                          ? "line-through text-muted"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: getCategoryColor(task.category) }}
                      >
                        {getCategoryLabel(task.category)}
                      </span>
                      <span className="text-[10px] text-muted flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {task.estimated_minutes} {t("common.minutes")}
                      </span>
                      {isTaskOverdue(task) && (
                        <span className="text-[10px] text-red-500 font-medium">{t("common.overdue")}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted text-sm">
                <Shield className="w-10 h-10 mx-auto mb-2 text-blue-300" />
                <p>{t("emergency.allDone")}</p>
                <p className="text-xs mt-1">{t("emergency.amazingMessage")}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
