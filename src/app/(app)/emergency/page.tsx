"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Check, Clock } from "lucide-react";
import { getCategoryColor, getCategoryLabel, TASK_TEMPLATES_SEED } from "@/lib/seed-data";

const EMERGENCY_TASKS = TASK_TEMPLATES_SEED.filter((t) => t.is_emergency);

export default function EmergencyPage() {
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());

  const completedCount = completedIds.size;
  const totalCount = EMERGENCY_TASKS.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function toggleTask(index: number) {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header Banner */}
      <motion.div
        className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Shield className="w-8 h-8 text-blue-500 dark:text-blue-400 mx-auto mb-2" />
        <h1 className="text-lg font-bold text-blue-700 dark:text-blue-300">מצב חירום פעיל</h1>
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          מתמקדים רק בחשוב. הכל בסדר, צעד אחד בכל פעם.
        </p>
      </motion.div>

      {/* Simplified Progress */}
      <div className="bg-surface dark:bg-[#1a1730] rounded-2xl p-4 text-center">
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
          משימות חיוניות בלבד
        </h2>
        {EMERGENCY_TASKS.map((task, i) => {
          const isCompleted = completedIds.has(i);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-surface dark:bg-[#1a1730] rounded-xl p-3 flex items-center gap-3 ${
                isCompleted ? "opacity-60" : ""
              }`}
            >
              <button
                onClick={() => toggleTask(i)}
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
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
