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
  onToggle: (taskId: string) => void;
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

  function handleToggle(taskId: string) {
    setCompleting(taskId);
    haptic("success");
    setTimeout(() => {
      onToggle(taskId);
      setCompleting(null);
    }, 200);
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        className="bg-surface rounded-2xl p-6 text-center"
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
        <span className="text-sm text-muted">
          {completed}/{tasks.length}
        </span>
      </div>
      <motion.div
        className="space-y-1.5"
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              variants={itemVariants}
              exit="exit"
              className={`bg-surface rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform duration-100 ${
                task.completed ? "opacity-60" : ""
              }`}
            >
              {/* Animated check button */}
              <button
                onClick={() => handleToggle(task.id)}
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 relative overflow-hidden transition-colors"
                style={{
                  borderColor: task.completed
                    ? "var(--color-success)"
                    : completing === task.id
                      ? "var(--color-success)"
                      : "var(--color-border)",
                  backgroundColor: task.completed
                    ? "var(--color-success)"
                    : completing === task.id
                      ? "rgba(34, 197, 94, 0.2)"
                      : "transparent",
                }}
              >
                {/* Ripple effect on completing */}
                <AnimatePresence>
                  {completing === task.id && !task.completed && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-success/20"
                      initial={{ scale: 0 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    />
                  )}
                </AnimatePresence>
                {/* Checkmark with spring animation */}
                <AnimatePresence>
                  {task.completed && (
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
                    task.completed
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
                      backgroundColor: getCategoryColor(task.category),
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
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
