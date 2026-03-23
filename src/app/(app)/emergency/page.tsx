"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Shield, Check, Clock, Loader2, AlertTriangle } from "lucide-react";
import { getCategoryColor, getCategoryLabel } from "@/lib/seed-data";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

interface EmergencyTask {
  id: string;
  title: string;
  category: string;
  estimated_minutes: number;
  due_date: string | null;
}

export default function EmergencyPage() {
  const [tasks, setTasks] = useState<EmergencyTask[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [togglingEmergency, setTogglingEmergency] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's household
      const { data: profile } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", user.id)
        .single();

      const hId = profile?.household_id ?? null;
      setHouseholdId(hId);

      if (hId) {
        // Get emergency_mode from household
        const { data: household } = await supabase
          .from("households")
          .select("emergency_mode")
          .eq("id", hId)
          .single();

        setEmergencyMode(household?.emergency_mode ?? false);

        // Get today + overdue task_instances marked as emergency from task_templates
        const today = new Date().toISOString().slice(0, 10);
        const { data: instances } = await supabase
          .from("task_instances")
          .select("id, due_date, status, template_id, task_templates(title, category, estimated_minutes, is_emergency)")
          .eq("household_id", hId)
          .lte("due_date", today)
          .eq("status", "pending");

        type InstanceRow = {
          id: string;
          due_date: string;
          status: string;
          template_id: string;
          task_templates: { title: string; category: string; estimated_minutes: number; is_emergency: boolean } | null;
        };

        if (instances) {
          const emergencyTasks: EmergencyTask[] = (instances as InstanceRow[])
            .filter((inst: InstanceRow) => inst.task_templates?.is_emergency === true)
            .map((inst: InstanceRow) => {
              const tmpl = inst.task_templates!;
              return {
                id: inst.id,
                title: tmpl.title,
                category: tmpl.category,
                estimated_minutes: tmpl.estimated_minutes,
                due_date: inst.due_date,
              };
            });
          setTasks(emergencyTasks);
        }
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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("task_instances")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              completed_by: user.id,
            })
            .eq("id", taskId);
        }
      } catch {
        // Silently ignore - optimistic update still works
      }
    } else {
      // Undo completion
      try {
        const supabase = createClient();
        await supabase
          .from("task_instances")
          .update({ status: "pending", completed_at: null, completed_by: null })
          .eq("id", taskId);
      } catch {
        // Silently ignore
      }
    }
  }

  async function toggleEmergencyMode() {
    if (!householdId) {
      toast.error("אין בית משויך לחשבון");
      return;
    }
    setTogglingEmergency(true);
    try {
      const supabase = createClient();
      const newMode = !emergencyMode;
      const { error } = await supabase
        .from("households")
        .update({ emergency_mode: newMode })
        .eq("id", householdId);

      if (error) {
        toast.error("שגיאה בעדכון מצב החירום");
      } else {
        setEmergencyMode(newMode);
        toast.success(newMode ? "מצב חירום הופעל" : "מצב חירום בוטל");
      }
    } catch {
      toast.error("שגיאה בחיבור לשרת");
    } finally {
      setTogglingEmergency(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
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
          className="w-full h-36 object-cover"
        />
        <div className="p-4">
        {emergencyMode ? (
          <>
            <Shield className="w-8 h-8 text-blue-500 dark:text-blue-400 mx-auto mb-2" />
            <h1 className="text-lg font-bold text-blue-700 dark:text-blue-300">מצב חירום פעיל</h1>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              מתמקדים רק בחשוב. הכל בסדר, צעד אחד בכל פעם.
            </p>
          </>
        ) : (
          <>
            <AlertTriangle className="w-8 h-8 text-muted mx-auto mb-2" />
            <h1 className="text-lg font-bold text-foreground">מצב חירום</h1>
            <p className="text-sm text-muted mt-1">
              הפעילו מצב חירום כשצריך להתמקד רק בחיוני
            </p>
          </>
        )}

        <button
          onClick={toggleEmergencyMode}
          disabled={togglingEmergency}
          aria-label={emergencyMode ? "ביטול מצב חירום" : "הפעלת מצב חירום"}
          className={`mt-3 px-5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
            emergencyMode
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-border text-foreground hover:bg-surface-hover"
          }`}
        >
          {togglingEmergency ? (
            <Loader2 className="w-4 h-4 animate-spin inline" />
          ) : emergencyMode ? (
            "ביטול מצב חירום"
          ) : (
            "הפעלת מצב חירום"
          )}
        </button>
        </div>
      </motion.div>

      {emergencyMode && (
        <>
          {/* Simplified Progress */}
          <div className="bg-surface dark:bg-surface rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {completedCount}/{totalCount}
            </div>
            <p className="text-sm text-muted">משימות חיוניות הושלמו</p>
            <div className="h-2 bg-blue-100 dark:bg-blue-900/40 rounded-full mt-3 overflow-hidden">
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted mt-2">יעד מצב חירום: 50%</p>
          </div>

          {/* Coaching Message */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xl">🫂</span>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              תקופה קשה? בסדר גמור. רק הבסיס, בלי לחץ.
            </p>
          </div>

          {/* Emergency Tasks */}
          <div className="space-y-2">
            <h2 className="font-semibold text-sm text-foreground px-1">
              משימות חיוניות בלבד {tasks.length === 0 && "(אין משימות חיוניות פתוחות)"}
            </h2>
            {tasks.map((task: EmergencyTask, i: number) => {
              const isCompleted = completedIds.has(task.id);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-surface dark:bg-surface rounded-xl p-3 flex items-center gap-3 ${
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
                        {task.estimated_minutes} דק׳
                      </span>
                      {task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && (
                        <span className="text-[10px] text-red-500 font-medium">באיחור</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted text-sm">
                <Shield className="w-10 h-10 mx-auto mb-2 text-blue-300" />
                <p>כל המשימות הדחופות הושלמו!</p>
                <p className="text-xs mt-1">כל הכבוד, עשיתם עבודה מצוינת 💙</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
