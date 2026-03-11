"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Filter, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import {
  getRecurrenceLabel,
  TASK_TEMPLATES_SEED,
} from "@/lib/seed-data";
import {
  CATEGORY_FILTER_KEYS,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_ILLUSTRATIONS,
  CATEGORY_NAME_TO_KEY,
  CATEGORY_KEY_TO_NAME,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/categories";
import { CategoryCard } from "@/components/category-card";
import { useTasks } from "@/hooks/useTasks";
import { useCompletions } from "@/hooks/useCompletions";
import { useProfile } from "@/hooks/useProfile";
import { useCategories } from "@/hooks/useCategories";


interface DbTaskView {
  id: string;
  title: string;
  categoryKey: string;
  estimated_minutes: number;
  isCompleted: boolean;
  tips: string[];
  isEmergency: boolean;
  recurrenceLabel: string;
  dueDate?: string;
  isOverdue: boolean;
}

export default function TasksPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("general");

  // Supabase hooks
  const { profile } = useProfile();
  const {
    tasks: dbTasks,
    loading: tasksLoading,
    createTask,
    deleteTask,
    updateTask,
    refetch: refetchTasks,
  } = useTasks({ realtime: true });
  const { markComplete, isCompletedToday, refetch: refetchCompletions } = useCompletions({ limit: 500 });
  const { categories, categoryMap } = useCategories();

  // ---- Auto-seed tasks for authenticated users on first visit ----
  const seedAttempted = useRef(false);
  useEffect(() => {
    if (seedAttempted.current || tasksLoading || dbTasks.length > 0 || !profile) return;
    seedAttempted.current = true;
    fetch("/api/seed", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.seeded) {
          refetchTasks();
        }
      })
      .catch(() => {
        // Seed failed - will use mock data fallback
      });
  }, [tasksLoading, dbTasks.length, profile, refetchTasks]);

  // Determine if we should use DB data or mock
  const hasDbTasks = !tasksLoading && dbTasks.length > 0;

  // Optimistic state: track tasks completed in this session before DB confirms
  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(new Set());
  const [optimisticUncompleted, setOptimisticUncompleted] = useState<Set<string>>(new Set());

  // Convert DB tasks to a display-friendly shape
  const dbTaskViews: DbTaskView[] = useMemo(
    () =>
      dbTasks.map((t) => {
        const categoryName = t.category_id ? categoryMap[t.category_id] : null;
        const categoryKey = categoryName
          ? (CATEGORY_NAME_TO_KEY[categoryName] ?? "general")
          : "general";

        // Check if task is overdue (due date is in the past and not completed)
        const today = new Date().toISOString().slice(0, 10);
        const isOverdue =
          t.due_date &&
          t.due_date < today &&
          t.status !== "completed";

        // For recurring tasks, use today's completions instead of permanent status.
        // One-time tasks use permanent status as before.
        const dbCompleted = t.recurring
          ? isCompletedToday(t.id)
          : t.status === "completed";
        const isCompleted = optimisticCompleted.has(t.id)
          ? true
          : optimisticUncompleted.has(t.id)
            ? false
            : dbCompleted;

        return {
          id: t.id,
          title: t.title,
          categoryKey,
          estimated_minutes: 10,
          isCompleted,
          tips: [],
          isEmergency: false,
          recurrenceLabel: t.recurring ? "חוזר" : "חד-פעמי",
          dueDate: t.due_date ?? undefined,
          isOverdue: !!isOverdue,
        };
      }),
    [dbTasks, categoryMap, optimisticCompleted, optimisticUncompleted, isCompletedToday]
  );

  // ---- Mock tasks (fallback mode) ----
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const filteredMockTasks = useMemo(
    () =>
      activeCategory === "all"
        ? TASK_TEMPLATES_SEED
        : TASK_TEMPLATES_SEED.filter((t) => t.category === activeCategory),
    [activeCategory]
  );

  const filteredDbTasks = useMemo(
    () =>
      activeCategory === "all"
        ? dbTaskViews
        : dbTaskViews.filter((t) => t.categoryKey === activeCategory),
    [activeCategory, dbTaskViews]
  );

  // Toggle for mock tasks
  function toggleMockTask(index: number) {
    const key = `task-${index}`;
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Toggle for DB tasks – optimistic UI with rollback
  const toggleDbTask = useCallback(
    async (taskId: string) => {
      if (!profile) return;

      const task = dbTasks.find((t) => t.id === taskId);
      if (!task) return;

      // Determine current visual state (including optimistic overrides)
      // For recurring tasks, use isCompletedToday (not task.status which stays "pending")
      const dbCompleted = task.recurring
        ? isCompletedToday(task.id)
        : task.status === "completed";
      const isCurrentlyCompleted = optimisticCompleted.has(taskId)
        ? true
        : optimisticUncompleted.has(taskId)
          ? false
          : dbCompleted;

      if (isCurrentlyCompleted) {
        // Un-complete: optimistic → pending
        haptic("tap");
        setOptimisticUncompleted((prev) => new Set(prev).add(taskId));
        setOptimisticCompleted((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });

        if (task.recurring) {
          // For recurring tasks: delete today's completion record
          const supabase = (await import("@/lib/supabase")).createClient();
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const { error: delError } = await supabase
            .from("task_completions")
            .delete()
            .eq("task_id", taskId)
            .eq("user_id", profile.id)
            .gte("completed_at", startOfDay.toISOString());

          setOptimisticUncompleted((prev) => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });

          if (!delError) {
            await refetchCompletions();
            toast.info("המשימה סומנה כלא הושלמה");
          } else {
            toast.error("שגיאה בעדכון המשימה");
          }
        } else {
          // For one-time tasks: revert task status to pending
          const success = await updateTask(taskId, { status: "pending" });
          setOptimisticUncompleted((prev) => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          if (success) {
            toast.info("המשימה סומנה כלא הושלמה");
          } else {
            toast.error("שגיאה בעדכון המשימה");
          }
        }
      } else {
        // Complete: optimistic → completed
        haptic("success");
        setOptimisticCompleted((prev) => new Set(prev).add(taskId));
        setOptimisticUncompleted((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });

        const result = await markComplete({ taskId, userId: profile.id, recurring: !!task.recurring });
        // Clear optimistic state
        setOptimisticCompleted((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        if (result) {
          toast.success("כל הכבוד! המשימה הושלמה 🎉");
        } else {
          toast.error("שגיאה בהשלמת המשימה");
        }
      }
    },
    [dbTasks, profile, markComplete, updateTask, optimisticCompleted, optimisticUncompleted, isCompletedToday, refetchCompletions]
  );

  // Add new task to DB
  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return;

    // Find category_id from categories table
    const categoryName = CATEGORY_KEY_TO_NAME[newTaskCategory] ?? "כללי";
    const category = categories.find((c) => c.name === categoryName);

    const todayStr = new Date().toISOString().slice(0, 10);

    const result = await createTask({
      title: newTaskTitle.trim(),
      category_id: category?.id ?? null,
      assigned_to: profile?.id ?? null,
      status: "pending",
      due_date: todayStr,
      points: 10,
      recurring: false,
    });

    if (result) {
      toast.success("המשימה נוספה בהצלחה!");
      setNewTaskTitle("");
      setShowAddForm(false);
    } else {
      toast.error("שגיאה בהוספת המשימה");
    }
  }, [newTaskTitle, newTaskCategory, categories, profile, createTask]);

  // Delete task from DB
  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      haptic("tap");
      const success = await deleteTask(taskId);
      if (success) {
        toast.success("המשימה נמחקה");
      } else {
        toast.error("שגיאה במחיקת המשימה");
      }
    },
    [deleteTask]
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-hero mesh-overlay rounded-b-[2rem] px-4 pt-6 pb-5 overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">משימות</h1>
            {hasDbTasks && (
              <p className="text-xs text-white/60 mt-0.5">
                {filteredDbTasks.filter(t => t.isCompleted).length}/{filteredDbTasks.length} הושלמו
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasDbTasks && (
              <button
                onClick={() => setShowAddForm((prev) => !prev)}
                className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition-colors border border-white/10"
                aria-label="הוספת משימה"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            )}
            <button className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white/70 transition-colors border border-white/10">
              <Filter className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">

      {/* Mock mode: login prompt banner */}
      {!hasDbTasks && !tasksLoading && (
        <div className="card-elevated p-4 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">מצב תצוגה בלבד</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">התחברו כדי לשמור משימות ולעקוב אחרי ההתקדמות</p>
          <a href="/login" className="inline-block mt-2 px-4 py-1.5 rounded-lg gradient-primary text-white text-xs font-medium">התחברו עכשיו</a>
        </div>
      )}

      {/* Add Task Form (DB mode only) */}
      {showAddForm && hasDbTasks && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          style={{ transformOrigin: "top" }}
          className="card-elevated p-4 space-y-3"
        >
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="שם המשימה..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            dir="rtl"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_KEYS.map((cat) => (
              <button
                key={cat}
                onClick={() => setNewTaskCategory(cat)}
                className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  newTaskCategory === cat
                    ? "text-white"
                    : "bg-background text-muted border border-border"
                }`}
                style={
                  newTaskCategory === cat
                    ? { backgroundColor: getCategoryColor(cat) }
                    : undefined
                }
              >
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="flex-1 py-2 rounded-xl gradient-primary text-white text-sm font-medium disabled:opacity-50 shadow-md shadow-primary/20"
            >
              הוסף משימה
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewTaskTitle("");
              }}
              className="px-4 py-2 rounded-lg bg-background text-muted text-sm"
            >
              ביטול
            </button>
          </div>
        </motion.div>
      )}

      {/* Category Filter Cards */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {CATEGORY_FILTER_KEYS.map((cat) => (
          <CategoryCard
            key={cat}
            categoryKey={cat}
            label={CATEGORY_LABELS[cat] ?? cat}
            illustration={cat !== "all" ? CATEGORY_ILLUSTRATIONS[cat] : undefined}
            icon={cat !== "all" ? CATEGORY_ICONS[cat] : "📋"}
            isActive={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            size="sm"
          />
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {/* Empty state for DB tasks */}
        {hasDbTasks && filteredDbTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-elevated p-8 text-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeCategory === "all" ? "/illustrations/tasks-done.jpg" : "/illustrations/empty-tasks.jpg"}
              alt={activeCategory === "all" ? "כל המשימות הושלמו" : "אין משימות בקטגוריה זו"}
              className="w-48 h-48 mx-auto object-cover rounded-2xl mb-3"
            />
            <p className="font-medium text-foreground">
              {activeCategory === "all"
                ? "אין משימות - הכל בסדר!"
                : "אין משימות בקטגוריה זו"}
            </p>
            <p className="text-sm text-muted mt-1">
              {activeCategory === "all"
                ? "הוסיפו משימה חדשה להתחיל"
                : "נסו לבחור קטגוריה אחרת"}
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {hasDbTasks
            ? /* ---- DB Tasks ---- */
              filteredDbTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`card-elevated p-3.5 flex items-start gap-3 relative overflow-hidden ${
                    task.isCompleted ? "opacity-50" : ""
                  } ${
                    task.isOverdue && !task.isCompleted
                      ? "ring-1 ring-red-500/20"
                      : ""
                  }`}
                  style={{
                    borderRight: `3px solid ${
                      task.isOverdue && !task.isCompleted
                        ? "#EF4444"
                        : task.isCompleted
                          ? "#10B981"
                          : getCategoryColor(task.categoryKey)
                    }`,
                  }}
                >
                  {/* Overdue indicator */}
                  {task.isOverdue && !task.isCompleted && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                      מאחר
                    </div>
                  )}
                  <button
                    onClick={() => toggleDbTask(task.id)}
                    aria-label={task.isCompleted ? `בטל השלמה: ${task.title}` : `סמן כהושלם: ${task.title}`}
                    aria-pressed={task.isCompleted}
                    className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      task.isCompleted
                        ? "bg-success border-success"
                        : task.isOverdue
                        ? "border-red-400 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        : "border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    {task.isCompleted && (
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-snug ${
                        task.isCompleted
                          ? "line-through text-muted"
                          : task.isOverdue
                          ? "text-red-700 dark:text-red-400"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-md text-white font-medium"
                        style={{
                          backgroundColor: getCategoryColor(task.categoryKey),
                        }}
                      >
                        {getCategoryLabel(task.categoryKey)}
                      </span>
                      <span className="text-[10px] text-muted px-2 py-0.5 rounded-md bg-background border border-border/50">
                        {task.recurrenceLabel}
                      </span>
                      <span className="text-[10px] text-muted flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {task.estimated_minutes} דק׳
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted/50 hover:text-red-500 transition-colors"
                    aria-label="מחיקת משימה"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))
            : /* ---- Mock Tasks (fallback) ---- */
              filteredMockTasks.map((task, i) => {
                const isCompleted = completedIds.has(`task-${i}`);
                return (
                  <motion.div
                    key={`${task.title}-${i}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`card-elevated p-3 flex items-start gap-3 relative overflow-hidden ${
                      isCompleted ? "opacity-60" : ""
                    }`}
                  >
                    <button
                      onClick={() => toggleMockTask(i)}
                      aria-label={isCompleted ? `בטל השלמה: ${task.title}` : `סמן כהושלם: ${task.title}`}
                      aria-pressed={isCompleted}
                      className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isCompleted
                          ? "bg-success border-success"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {isCompleted && (
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted
                            ? "line-through text-muted"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                          style={{
                            backgroundColor: getCategoryColor(task.category),
                          }}
                        >
                          {getCategoryLabel(task.category)}
                        </span>
                        <span className="text-[10px] text-muted px-1.5 py-0.5 rounded-full bg-background">
                          {getRecurrenceLabel(task.recurrence_type)}
                        </span>
                        <span className="text-[10px] text-muted flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {task.estimated_minutes} דק׳
                        </span>
                        {task.is_emergency && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-medium">
                            חירום
                          </span>
                        )}
                      </div>
                      {task.tips.length > 0 && (
                        <p className="text-[11px] text-muted mt-1">
                          💡 {task.tips[0]}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
        </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
