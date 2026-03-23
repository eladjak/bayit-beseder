"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Filter, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import {
  getRecurrenceLabel,
  TASK_TEMPLATES_SEED,
} from "@/lib/seed-data";
import {
  CATEGORY_KEY_TO_NAME,
  CATEGORY_NAME_TO_KEY,
  CATEGORY_ILLUSTRATIONS,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/categories";
import { CategoryCard } from "@/components/category-card";
import { TaskCategoryManager } from "@/components/tasks/task-category-manager";
import { useTasks } from "@/hooks/useTasks";
import { useCompletions } from "@/hooks/useCompletions";
import { useProfile } from "@/hooks/useProfile";
import { useCategories } from "@/hooks/useCategories";
import { useTaskCategories } from "@/hooks/useTaskCategories";


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
  const [showCategoryManager, setShowCategoryManager] = useState(false);
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
  const {
    taskCategories,
    addTaskCategory,
    updateTaskCategory,
    deleteTaskCategory,
    reorderTaskCategories,
  } = useTaskCategories();

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

  // Determine if we should use DB data or mock.
  // "Sticky" — once we see real DB tasks, don't flip back to mock during refetches.
  const sawDbTasks = useRef(false);
  if (!tasksLoading && dbTasks.length > 0) {
    sawDbTasks.current = true;
  }
  const hasDbTasks = sawDbTasks.current || (!tasksLoading && dbTasks.length > 0);

  // Optimistic state: track tasks completed in this session before DB confirms
  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(new Set());
  const [optimisticUncompleted, setOptimisticUncompleted] = useState<Set<string>>(new Set());

  // Build a name→key lookup from dynamic task categories
  // Dynamic categories use their name as the key (since they have no legacy key).
  // For backward compat the 8 hardcoded names still map to the legacy keys via categories.ts.
  const dynamicCategoryNameToKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const tc of taskCategories) {
      // Use the category id as key for dynamic categories so it's always unique
      map[tc.name] = tc.id;
    }
    return map;
  }, [taskCategories]);

  // Convert DB tasks to a display-friendly shape
  const dbTaskViews: DbTaskView[] = useMemo(
    () =>
      dbTasks.map((t) => {
        const categoryName = t.category_id ? categoryMap[t.category_id] : null;
        // Prefer dynamic category id lookup, fall back to hardcoded key
        const categoryKey = categoryName
          ? (dynamicCategoryNameToKey[categoryName] ?? CATEGORY_KEY_TO_NAME[categoryName] ?? "general")
          : "general";

        // Check if task is overdue (due date is in the past and not completed)
        const today = new Date().toISOString().slice(0, 10);
        const isOverdue =
          t.due_date &&
          t.due_date < today &&
          t.status !== "completed";

        // For recurring tasks, use today's completions instead of permanent status.
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
    [dbTasks, categoryMap, dynamicCategoryNameToKey, optimisticCompleted, optimisticUncompleted, isCompletedToday]
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

  const pendingDbTasks = useMemo(
    () => filteredDbTasks.filter((t) => !t.isCompleted),
    [filteredDbTasks]
  );
  const completedDbTasks = useMemo(
    () => filteredDbTasks.filter((t) => t.isCompleted),
    [filteredDbTasks]
  );
  const [showCompleted, setShowCompleted] = useState(true);

  // Toggle for mock tasks
  function toggleMockTask(index: number) {
    const key = `task-${index}`;
    const isCurrentlyCompleted = completedIds.has(key);
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    if (isCurrentlyCompleted) {
      haptic("tap");
      toast("המשימה סומנה כלא הושלמה");
    } else {
      haptic("success");
      toast.success("המשימה הושלמה! 🎉");
    }
  }

  // Toggle for DB tasks – optimistic UI with rollback
  const toggleDbTask = useCallback(
    async (taskId: string) => {
      if (!profile) {
        toast.error("יש להתחבר כדי לסמן משימות");
        return;
      }

      const task = dbTasks.find((t) => t.id === taskId);
      if (!task) return;

      const dbCompleted = task.recurring
        ? isCompletedToday(task.id)
        : task.status === "completed";
      const isCurrentlyCompleted = optimisticCompleted.has(taskId)
        ? true
        : optimisticUncompleted.has(taskId)
          ? false
          : dbCompleted;

      if (isCurrentlyCompleted) {
        haptic("tap");
        setOptimisticUncompleted((prev) => new Set(prev).add(taskId));
        setOptimisticCompleted((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });

        if (task.recurring) {
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
        haptic("success");
        setOptimisticCompleted((prev) => new Set(prev).add(taskId));
        setOptimisticUncompleted((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });

        const result = await markComplete({ taskId, userId: profile.id, recurring: !!task.recurring });
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
    const categoryName = CATEGORY_KEY_TO_NAME[newTaskCategory] ?? newTaskCategory;
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

  // Resolve display label/color/icon for a categoryKey that may be either a
  // legacy string key ("kitchen") or a dynamic UUID from task_categories.
  const resolveCategoryDisplay = useCallback(
    (key: string) => {
      // Check if it matches a dynamic task category by id
      const dynamicCat = taskCategories.find((tc) => tc.id === key);
      if (dynamicCat) {
        return {
          label: dynamicCat.name,
          color: dynamicCat.color,
          icon: dynamicCat.icon,
        };
      }
      // Fall back to hardcoded helpers
      return {
        label: getCategoryLabel(key),
        color: getCategoryColor(key),
        icon: null,
      };
    },
    [taskCategories]
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
            <button
              onClick={() => {
                if (hasDbTasks) {
                  setShowAddForm((prev) => !prev);
                } else {
                  toast("התחברו כדי להוסיף משימות");
                }
              }}
              className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition-colors border border-white/10"
              aria-label="הוספת משימה"
            >
              <Plus className="w-4.5 h-4.5" />
            </button>
            <button className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white/70 transition-colors border border-white/10">
              <Filter className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">

      {/* Mock mode: login prompt banner */}
      {!hasDbTasks && !tasksLoading && (
        <div className="rounded-xl overflow-hidden border-2 border-amber-300/70 dark:border-amber-700/50 shadow-md shadow-amber-100/50 dark:shadow-amber-950/20">
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
            <p className="text-base font-bold text-amber-900 dark:text-amber-100">👋 מצב תצוגה בלבד</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              אלו משימות לדוגמה. התחברו כדי לנהל את המשימות הבייתיות שלכם ולעקוב אחרי ההתקדמות.
            </p>
            <a
              href="/login"
              className="inline-block mt-3 px-6 py-2 rounded-xl gradient-primary text-white text-sm font-semibold shadow-md shadow-primary/25 active:scale-95 transition-transform"
            >
              התחברות / הרשמה
            </a>
          </div>
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
            {taskCategories.map((tc) => (
              <button
                key={tc.id}
                onClick={() => setNewTaskCategory(tc.name)}
                className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  newTaskCategory === tc.name
                    ? "text-white"
                    : "bg-background text-muted border border-border"
                }`}
                style={
                  newTaskCategory === tc.name
                    ? { backgroundColor: tc.color }
                    : undefined
                }
              >
                {tc.icon} {tc.name}
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

      {/* Category Filter Cards + gear icon */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-0 flex-1 scrollbar-none">
          {/* "All" card */}
          <CategoryCard
            categoryKey="all"
            label="הכל"
            icon="📋"
            isActive={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            size="sm"
          />
          {/* Dynamic task categories */}
          {taskCategories.map((tc) => {
            const staticKey = CATEGORY_NAME_TO_KEY[tc.name];
            return (
              <CategoryCard
                key={tc.id}
                categoryKey={tc.id}
                label={tc.name}
                icon={tc.icon}
                illustration={staticKey ? CATEGORY_ILLUSTRATIONS[staticKey] : undefined}
                isActive={activeCategory === tc.id}
                onClick={() => setActiveCategory(tc.id)}
                size="sm"
              />
            );
          })}
        </div>
        {/* Manage categories button */}
        {hasDbTasks && (
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex-shrink-0 p-2 rounded-xl bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors mb-2"
            aria-label="ניהול קטגוריות"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
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
            <Image
              src={activeCategory === "all" ? "/illustrations/tasks-done.jpg" : "/illustrations/empty-tasks.jpg"}
              alt={activeCategory === "all" ? "כל המשימות הושלמו" : "אין משימות בקטגוריה זו"}
              width={192}
              height={192}
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
            ? /* ---- DB Tasks (pending) ---- */
              pendingDbTasks.map((task) => {
                const display = resolveCategoryDisplay(task.categoryKey);
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`card-elevated p-3.5 flex items-start gap-3 relative overflow-hidden ${
                      task.isOverdue
                        ? "ring-1 ring-red-500/20"
                        : ""
                    }`}
                    style={{
                      borderRight: `3px solid ${
                        task.isOverdue
                          ? "#EF4444"
                          : display.color
                      }`,
                    }}
                  >
                    {task.isOverdue && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                        מאחר
                      </div>
                    )}
                    <button
                      onClick={() => toggleDbTask(task.id)}
                      aria-label={`סמן כהושלם: ${task.title}`}
                      aria-pressed={false}
                      className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        task.isOverdue
                          ? "border-red-400 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          : "border-border hover:border-primary hover:bg-primary/5"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${
                        task.isOverdue ? "text-red-700 dark:text-red-400" : "text-foreground"
                      }`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-md text-white font-medium"
                          style={{ backgroundColor: display.color }}
                        >
                          {display.icon ? `${display.icon} ` : ""}{display.label}
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
                );
              })
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

        {/* ---- Completed Tasks Section ---- */}
        {hasDbTasks && completedDbTasks.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowCompleted((prev) => !prev)}
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-full"
            >
              <div className="h-px flex-1 bg-border" />
              <span className="font-medium px-2">
                {showCompleted ? "▾" : "▸"} הושלמו ({completedDbTasks.length})
              </span>
              <div className="h-px flex-1 bg-border" />
            </button>
            {showCompleted && (
              <div className="space-y-2 mt-2">
                {completedDbTasks.map((task) => {
                  const display = resolveCategoryDisplay(task.categoryKey);
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="card-elevated p-3 flex items-start gap-3 opacity-50"
                      style={{ borderRight: `3px solid #10B981` }}
                    >
                      <button
                        onClick={() => toggleDbTask(task.id)}
                        aria-label={`בטל השלמה: ${task.title}`}
                        aria-pressed={true}
                        className="mt-0.5 w-6 h-6 rounded-lg border-2 bg-success border-success flex items-center justify-center flex-shrink-0"
                      >
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-through text-muted">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-md text-white/80 font-medium"
                            style={{ backgroundColor: display.color }}
                          >
                            {display.icon ? `${display.icon} ` : ""}{display.label}
                          </span>
                          <span className="text-[10px] text-muted px-2 py-0.5 rounded-md bg-background border border-border/50">
                            {task.recurrenceLabel}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Task Category Manager modal */}
      <AnimatePresence>
        {showCategoryManager && (
          <TaskCategoryManager
            categories={taskCategories}
            onAdd={addTaskCategory}
            onUpdate={updateTaskCategory}
            onDelete={deleteTaskCategory}
            onReorder={reorderTaskCategories}
            onClose={() => setShowCategoryManager(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
