"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Filter } from "lucide-react";
import {
  getCategoryColor,
  getCategoryLabel,
  getRecurrenceLabel,
  TASK_TEMPLATES_SEED,
} from "@/lib/seed-data";

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

export default function TasksPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const filteredTasks =
    activeCategory === "all"
      ? TASK_TEMPLATES_SEED
      : TASK_TEMPLATES_SEED.filter((t) => t.category === activeCategory);

  function toggleTask(index: number) {
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

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">משימות</h1>
        <button className="p-2 rounded-lg hover:bg-surface-hover text-muted">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary text-white"
                : "bg-surface text-muted hover:bg-surface-hover border border-border"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task, i) => {
            const isCompleted = completedIds.has(`task-${i}`);
            return (
              <motion.div
                key={`${task.title}-${i}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-surface rounded-xl p-3 flex items-start gap-3 ${
                  isCompleted ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() => toggleTask(i)}
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
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
  );
}
