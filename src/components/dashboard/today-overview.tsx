"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { getCategoryColor, getCategoryLabel } from "@/lib/seed-data";
import { haptic } from "@/lib/haptics";

export interface TaskItem {
  id: string;
  title: string;
  category: string;
  estimated_minutes: number;
  assigned_to_name?: string;
  completed: boolean;
}

interface TodayOverviewProps {
  tasks: TaskItem[];
  onToggle: (taskId: string) => Promise<void>;
}

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    x: -60,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

export function TodayOverview({ tasks, onToggle }: TodayOverviewProps) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(new Set());

  async function handleToggle(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic UI update
    const wasCompleted = task.completed || optimisticCompleted.has(taskId);
    const newOptimistic = new Set(optimisticCompleted);

    if (wasCompleted) {
      newOptimistic.delete(taskId);
    } else {
      newOptimistic.add(taskId);
    }

    setOptimisticCompleted(newOptimistic);
    setCompleting(taskId);
    haptic("success");

    try {
      // Wait for the parent handler to complete
      await onToggle(taskId);
      // Success - keep the optimistic state
    } catch (error) {
      // Rollback on failure
      setOptimisticCompleted(optimisticCompleted);
      console.error("Failed to toggle task:", error);
    } finally {
      setTimeout(() => setCompleting(null), 200);
    }
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        className="card-elevated p-6 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <span className="text-3xl mb-2 block">🎉</span>
        <p className="font-medium text-foreground">אין משימות להיום!</p>
        <p className="text-sm text-muted">יום חופשי מגיע לכם</p>
      </motion.div>
    );
  }

  const completed = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-semibold text-foreground">משימות להיום</h2>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          {completed}/{tasks.length}
        </span>
      </div>
      <motion.div
        className="space-y-2"
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => {
            const catColor = getCategoryColor(task.category);
            const isCompleted = task.completed || optimisticCompleted.has(task.id);
            const isLoading = completing === task.id;

            return (
              <motion.div
                key={task.id}
                layout
                variants={itemVariants}
                exit="exit"
                className={`card-elevated p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform duration-100 overflow-hidden relative ${
                  isCompleted ? "opacity-60" : ""
                } ${isLoading ? "pointer-events-none" : ""}`}
              >
                {/* Category accent bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 rounded-r-full"
                  style={{ backgroundColor: catColor }}
                />

                {/* Animated check button */}
                <button
                  onClick={() => handleToggle(task.id)}
                  disabled={isLoading}
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 relative overflow-hidden transition-all disabled:cursor-wait"
                  style={{
                    borderColor: isCompleted
                      ? "var(--color-success)"
                      : isLoading
                        ? "var(--color-success)"
                        : "var(--color-border)",
                    backgroundColor: isCompleted
                      ? "var(--color-success)"
                      : isLoading
                        ? "rgba(16, 185, 129, 0.2)"
                        : "transparent",
                    boxShadow: isCompleted ? "0 0 8px rgba(16, 185, 129, 0.3)" : "none",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  <AnimatePresence>
                    {isLoading && !isCompleted && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-success/20"
                        initial={{ scale: 0 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 45 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 15,
                          mass: 0.5,
                        }}
                      >
                        <Check
                          className="w-4 h-4 text-white"
                          strokeWidth={3}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                      style={{
                        backgroundColor: catColor,
                      }}
                    >
                      {getCategoryLabel(task.category)}
                    </span>
                    <span className="text-[10px] text-muted flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {task.estimated_minutes} דק׳
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
