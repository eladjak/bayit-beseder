"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  TrendingUp,
  Clock,
  Users,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { usePartner } from "@/hooks/usePartner";
import {
  analyzeDailyLoad,
  generateSmartSuggestions,
  getWeekRange,
  type DayLoad,
  type Suggestion,
} from "@/lib/smart-scheduler";
import type { TaskRow } from "@/lib/types/database";

// Category colors (consistent with other pages)
const CATEGORY_COLORS: Record<string, string> = {
  kitchen: "bg-amber-500",
  bathroom: "bg-cyan-500",
  living: "bg-emerald-500",
  bedroom: "bg-violet-500",
  laundry: "bg-blue-500",
  outdoor: "bg-lime-500",
  pets: "bg-orange-500",
  general: "bg-slate-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  kitchen: "מטבח",
  bathroom: "אמבטיה",
  living: "סלון",
  bedroom: "חדר שינה",
  laundry: "כביסה",
  outdoor: "חיצוני",
  pets: "חיות",
  general: "כללי",
};

// Mock data for when Supabase is not connected
function generateMockWeeklyTasks(): TaskRow[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);

  const mockTasks: TaskRow[] = [];
  const taskTemplates = [
    { title: "שטיפת כלים / הפעלת מדיח", category: "kitchen", minutes: 15 },
    { title: "ניקוי משטחי עבודה במטבח", category: "kitchen", minutes: 5 },
    { title: "טאטוא רצפת מטבח", category: "kitchen", minutes: 5 },
    { title: "הוצאת אשפה", category: "kitchen", minutes: 5 },
    { title: "ניקוי כיריים", category: "kitchen", minutes: 20 },
    { title: "ניקוי שירותים", category: "bathroom", minutes: 15 },
    { title: "ניקוי מקלחת", category: "bathroom", minutes: 15 },
    { title: "החלפת מגבות", category: "bathroom", minutes: 5 },
    { title: "שאיבת אבק בסלון", category: "living", minutes: 15 },
    { title: "ניגוב רצפות רטוב", category: "living", minutes: 20 },
    { title: "ניקוי אבק מרהיטים", category: "living", minutes: 10 },
    { title: "החלפת מצעים", category: "bedroom", minutes: 15 },
    { title: "ניקוי אבק בחדר שינה", category: "bedroom", minutes: 10 },
    { title: "שאיבת אבק בחדר שינה", category: "bedroom", minutes: 10 },
    { title: "כביסה (2-3 מכונות)", category: "laundry", minutes: 30 },
    { title: "קיפול וסידור כביסה", category: "laundry", minutes: 20 },
    { title: "האכלת חתולים (בוקר)", category: "pets", minutes: 5 },
    { title: "האכלת חתולים (ערב)", category: "pets", minutes: 5 },
    { title: "מים טריים לחתולים", category: "pets", minutes: 2 },
    { title: "ניקוי ארגז חול", category: "pets", minutes: 5 },
    { title: "השקיית צמחים", category: "general", minutes: 10 },
    { title: "איוורור הבית", category: "general", minutes: 2 },
  ];

  // Distribute tasks across the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    // Assign 2-5 tasks per day
    const numTasks = Math.floor(Math.random() * 4) + 2;
    const shuffled = [...taskTemplates].sort(() => Math.random() - 0.5);

    for (let j = 0; j < numTasks; j++) {
      const template = shuffled[j % shuffled.length];
      mockTasks.push({
        id: `mock-${i}-${j}`,
        title: template.title,
        description: null,
        category_id: template.category,
        frequency: "weekly",
        assigned_to: Math.random() > 0.5 ? "user1" : "user2",
        status: Math.random() > 0.7 ? "completed" : "pending",
        due_date: dateStr,
        points: 10,
        recurring: true,
        created_at: new Date().toISOString(),
      });
    }
  }

  return mockTasks;
}

function getCategoryFromId(categoryId: string | null): string {
  if (!categoryId) return "general";
  // categoryId might be a key like "kitchen" or a UUID
  if (categoryId in CATEGORY_LABELS) return categoryId;
  return "general";
}

export default function WeeklyPage() {
  const { profile } = useProfile();
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { partner } = usePartner(profile?.partner_id, todayStr);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Get start of week (Sunday)
  const startOfWeek = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);

  // Get end of week (Saturday)
  const endOfWeek = useMemo(() => {
    const end = new Date(startOfWeek);
    end.setDate(end.getDate() + 6);
    return end;
  }, [startOfWeek]);

  // Fetch tasks for this week
  const { tasks, loading } = useTasks({});

  // Filter tasks for this week or use mock data
  const weekTasks = useMemo(() => {
    if (loading) return [];

    if (tasks.length === 0) {
      // No Supabase data - use mock
      return generateMockWeeklyTasks();
    }

    const startStr = startOfWeek.toISOString().split("T")[0];
    const endStr = endOfWeek.toISOString().split("T")[0];

    return tasks.filter((t) => {
      if (!t.due_date) return false;
      return t.due_date >= startStr && t.due_date <= endStr;
    });
  }, [tasks, loading, startOfWeek, endOfWeek]);

  // Analyze daily loads
  const dailyLoads = useMemo(
    () => analyzeDailyLoad(weekTasks, startOfWeek),
    [weekTasks, startOfWeek]
  );

  // Generate smart suggestions
  const suggestions = useMemo(
    () => generateSmartSuggestions(weekTasks),
    [weekTasks]
  );

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = weekTasks.length;
    const completed = weekTasks.filter((t) => t.status === "completed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const myTasks = weekTasks.filter((t) => t.assigned_to === profile?.id);
    // Partner tasks = all tasks not assigned to me
    const partnerTasks = weekTasks.filter(
      (t) => t.assigned_to && t.assigned_to !== profile?.id
    );

    const fairnessRatio =
      myTasks.length > 0 && partnerTasks.length > 0
        ? Math.min(myTasks.length, partnerTasks.length) /
          Math.max(myTasks.length, partnerTasks.length)
        : 1;

    return {
      total,
      completed,
      completionRate,
      myTasks: myTasks.length,
      partnerTasks: partnerTasks.length,
      fairnessRatio,
    };
  }, [weekTasks, profile?.id]);

  const weekRange = getWeekRange(startOfWeek);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-primary rounded-b-3xl px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white">תכנון שבועי</h1>
            <p className="text-sm text-white/70">{weekRange}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full">
            <Calendar className="w-4 h-4 text-white" />
            <span className="text-xs font-medium text-white">
              {stats.total} משימות
            </span>
          </div>
        </div>

        {/* Week summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
            <div className="text-xs text-white/70 mb-0.5">סיום</div>
            <div className="text-lg font-bold text-white">
              {stats.completionRate}%
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
            <div className="text-xs text-white/70 mb-0.5">שלך</div>
            <div className="text-lg font-bold text-white">{stats.myTasks}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
            <div className="text-xs text-white/70 mb-0.5">
              {partner?.name || "שותף"}
            </div>
            <div className="text-lg font-bold text-white">
              {stats.partnerTasks}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Smart Suggestions Panel */}
        {suggestions.length > 0 && (
          <div className="card-elevated bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-100/50 dark:border-purple-800/30 overflow-hidden">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-foreground">
                    המלצות חכמות
                  </div>
                  <div className="text-xs text-muted">
                    {suggestions.length} הצעות לשיפור
                  </div>
                </div>
              </div>
              {showSuggestions ? (
                <ChevronUp className="w-5 h-5 text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted" />
              )}
            </button>

            {showSuggestions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4 space-y-2"
              >
                {suggestions.map((suggestion, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-3 rounded-xl bg-white/60 dark:bg-surface/80 backdrop-blur-sm border ${
                      suggestion.priority === "high"
                        ? "border-red-200 dark:border-red-800/50"
                        : suggestion.priority === "medium"
                          ? "border-amber-200 dark:border-amber-800/50"
                          : "border-slate-200 dark:border-slate-700/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          suggestion.priority === "high"
                            ? "bg-red-500"
                            : suggestion.priority === "medium"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-foreground">
                          {suggestion.title}
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          {suggestion.description}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Day-by-Day View */}
        <div className="space-y-3">
          {dailyLoads.map((dayLoad, idx) => (
            <DayCard key={dayLoad.date} dayLoad={dayLoad} index={idx} />
          ))}
        </div>

        {/* This Week's Summary */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">סיכום השבוע</h3>
          </div>

          <div className="space-y-3">
            {/* Fairness ratio */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted" />
                <span className="text-sm text-foreground">איזון משימות</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-foreground">
                  {Math.round(stats.fairnessRatio * 100)}%
                </div>
                <div className="w-24 h-2 bg-border/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${stats.fairnessRatio * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Time distribution */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted" />
                <span className="text-sm text-foreground">זמן כולל</span>
              </div>
              <div className="text-sm font-medium text-foreground">
                {dailyLoads.reduce((sum, d) => sum + d.totalMinutes, 0)} דקות
              </div>
            </div>

            {/* Completion rate */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted" />
                <span className="text-sm text-foreground">אחוז השלמה</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {stats.completionRate}%
                </span>
                <div className="text-xs text-muted">
                  ({stats.completed}/{stats.total})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DayCardProps {
  dayLoad: DayLoad;
  index: number;
}

function DayCard({ dayLoad, index }: DayCardProps) {
  const [expanded, setExpanded] = useState(false);

  const difficultyColors = {
    light: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400",
    moderate: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
    heavy: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400",
  };

  const difficultyLabels = {
    light: "קל",
    moderate: "בינוני",
    heavy: "כבד",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`card-elevated overflow-hidden ${
        dayLoad.isHeavy
          ? "ring-2 ring-red-200 dark:ring-red-800/50 shadow-lg shadow-red-500/10"
          : "shadow-lg shadow-purple-500/10 border border-purple-100/50 dark:border-purple-800/30"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-right"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="font-bold text-foreground">{dayLoad.dayName}</div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[dayLoad.difficulty]}`}
            >
              {difficultyLabels[dayLoad.difficulty]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-muted">
              <Clock className="w-3 h-3" />
              {dayLoad.totalMinutes} דק'
            </div>
            <div className="text-sm font-medium text-muted">
              {dayLoad.tasks.length} משימות
            </div>
          </div>
        </div>

        {/* Category badges preview */}
        {!expanded && (
          <div className="flex flex-wrap gap-1">
            {Array.from(
              new Set(
                dayLoad.tasks.map((t) => getCategoryFromId(t.category_id))
              )
            )
              .slice(0, 4)
              .map((category) => (
                <div
                  key={category}
                  className={`${CATEGORY_COLORS[category]} w-2 h-2 rounded-full`}
                />
              ))}
            {dayLoad.tasks.length > 4 && (
              <div className="text-xs text-muted">+{dayLoad.tasks.length - 4}</div>
            )}
          </div>
        )}
      </button>

      {/* Expanded task list */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4 space-y-2"
        >
          {dayLoad.tasks.map((task) => {
            const category = getCategoryFromId(task.category_id);
            return (
              <div
                key={task.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-background/50 dark:bg-background/30"
              >
                <div
                  className={`${CATEGORY_COLORS[category]} w-3 h-3 rounded-full flex-shrink-0`}
                />
                <div className="flex-1">
                  <div
                    className={`text-sm ${
                      task.status === "completed"
                        ? "line-through text-muted"
                        : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </div>
                  <div className="text-xs text-muted">
                    {CATEGORY_LABELS[category]}
                  </div>
                </div>
                {task.status === "completed" && (
                  <div className="text-xs text-green-600 font-medium">✓</div>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
