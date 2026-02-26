"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Filter, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getCategoryColor,
  getCategoryLabel,
  getRecurrenceLabel,
  TASK_TEMPLATES_SEED,
} from "@/lib/seed-data";
import { useTasks } from "@/hooks/useTasks";
import { useCompletions } from "@/hooks/useCompletions";
import { useProfile } from "@/hooks/useProfile";
import { useCategories } from "@/hooks/useCategories";

const CATEGORIES = [
  "all",
  "kitchen",
  "bathroom",
  "living",
  "bedroom",
  "laundry",
  "outdoor",
  "pets",
  "general",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  all: "הכל",
  kitchen: "מטבח",
  bathroom: "אמבטיה",
  living: "סלון",
  bedroom: "חדר שינה",
  laundry: "כביסה",
  outdoor: "חיצוני",
  pets: "חיות",
  general: "כללי",
};

// Map Hebrew category names (from DB) to internal keys
const CATEGORY_NAME_TO_KEY: Record<string, string> = {
  "מטבח": "kitchen",
  "אמבטיה": "bathroom",
  "סלון": "living",
  "חדר שינה": "bedroom",
  "כביסה": "laundry",
  "חוץ": "outdoor",
  "חיות מחמד": "pets",
  "כללי": "general",
};

// Map category key to Hebrew name for DB lookup
const CATEGORY_KEY_TO_NAME: Record<string, string> = {
  kitchen: "מטבח",
  bathroom: "אמבטיה",
  living: "סלון",
  bedroom: "חדר שינה",
  laundry: "כביסה",
  outdoor: "חוץ",
  pets: "חיות מחמד",
  general: "כללי",
};

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
  } = useTasks({ realtime: true });
  const { markComplete } = useCompletions();
  const { categories, categoryMap } = useCategories();

  // Determine if we should use DB data or mock
  const hasDbTasks = !tasksLoading && dbTasks.length > 0;

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

        return {
          id: t.id,
          title: t.title,
          categoryKey,
          estimated_minutes: 10,
          isCompleted: t.status === "completed",
          tips: [],
          isEmergency: false,
          recurrenceLabel: t.recurring ? "חוזר" : "חד-פעמי",
          dueDate: t.due_date ?? undefined,
          isOverdue: !!isOverdue,
        };
      }),
    [dbTasks, categoryMap]
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

  // Toggle for DB tasks
  const toggleDbTask = useCallback(
    async (taskId: string) => {
      if (!profile) return;

      const task = dbTasks.find((t) => t.id === taskId);
      if (!task) return;

      if (task.status === "completed") {
        // Un-complete: set back to pending
        const success = await updateTask(taskId, { status: "pending" });
        if (success) {
          toast.info("המשימה סומנה כלא הושלמה");
        }
      } else {
        // Complete the task
        const result = await markComplete({ taskId, userId: profile.id });
        if (result) {
          toast.success("כל הכבוד! המשימה הושלמה 🎉");
        }
      }
    },
    [dbTasks, profile, markComplete, updateTask]
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
      <div className="gradient-primary rounded-b-3xl px-4 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">משימות</h1>
          <div className="flex items-center gap-2">
            {hasDbTasks && (
              <button
                onClick={() => setShowAddForm((prev) => !prev)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/80"
                aria-label="הוספת משימה"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <button className="p-2 rounded-lg hover:bg-white/10 text-white/60">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">

      {/* Add Task Form (DB mode only) */}
      {showAddForm && hasDbTasks && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
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
            {CATEGORIES.filter((c) => c !== "all").map((cat) => (
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
                {CATEGORY_LABELS[cat]}
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

      {/* Category Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === cat
                ? "gradient-primary text-white shadow-md shadow-primary/20"
                : "bg-surface text-muted hover:bg-surface-hover card-elevated"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
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
            <span className="text-4xl mb-3 block">
              {activeCategory === "all" ? "🎉" : "✨"}
            </span>
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
                  className={`bg-surface rounded-xl p-3 flex items-start gap-3 relative ${
                    task.isCompleted ? "opacity-60" : ""
                  } ${
                    task.isOverdue && !task.isCompleted
                      ? "ring-2 ring-red-500/30 bg-red-50/30 dark:bg-red-950/20"
                      : ""
                  }`}
                >
                  {/* Overdue indicator */}
                  {task.isOverdue && !task.isCompleted && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                      מאחר
                    </div>
                  )}
                  <button
                    onClick={() => toggleDbTask(task.id)}
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      task.isCompleted
                        ? "bg-success border-success"
                        : task.isOverdue
                        ? "border-red-500 hover:border-red-600"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {task.isCompleted && (
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.isCompleted
                          ? "line-through text-muted"
                          : task.isOverdue
                          ? "text-red-700 dark:text-red-400"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                        style={{
                          backgroundColor: getCategoryColor(task.categoryKey),
                        }}
                      >
                        {getCategoryLabel(task.categoryKey)}
                      </span>
                      <span className="text-[10px] text-muted px-1.5 py-0.5 rounded-full bg-background">
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
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted hover:text-red-500 transition-colors"
                    aria-label="מחיקת משימה"
                  >
                    <Trash2 className="w-4 h-4" />
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
