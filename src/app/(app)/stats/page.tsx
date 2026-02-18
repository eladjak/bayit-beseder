"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Trophy, History } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { getCategoryColor, getCategoryLabel } from "@/lib/seed-data";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { computeWeeklyTrend } from "@/lib/task-stats";
import { useTasks } from "@/hooks/useTasks";
import { useCompletions } from "@/hooks/useCompletions";
import { useCategories } from "@/hooks/useCategories";

// Map Hebrew category names -> internal keys (same as dashboard)
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

const MOCK_WEEKLY_DATA = [
  { day: "א׳", completed: 7, total: 10 },
  { day: "ב׳", completed: 9, total: 10 },
  { day: "ג׳", completed: 6, total: 10 },
  { day: "ד׳", completed: 8, total: 10 },
  { day: "ה׳", completed: 10, total: 10 },
  { day: "ו׳", completed: 5, total: 8 },
  { day: "ש׳", completed: 3, total: 5 },
];

const CATEGORY_DATA = [
  { name: "מטבח", value: 35, category: "kitchen" },
  { name: "אמבטיה", value: 20, category: "bathroom" },
  { name: "סלון", value: 15, category: "living" },
  { name: "חיות", value: 15, category: "pets" },
  { name: "כביסה", value: 10, category: "laundry" },
  { name: "כללי", value: 5, category: "general" },
];

const UNLOCKED_ACHIEVEMENTS = ["first_task", "streak_3", "streak_7", "golden_rule_5"];

export default function StatsPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { tasks } = useTasks({});
  const { completions } = useCompletions({ limit: 200 });
  const { categoryMap } = useCategories();

  // Build category_id -> key mapping
  const categoryIdToKey = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [id, name] of Object.entries(categoryMap)) {
      result[id] = CATEGORY_NAME_TO_KEY[name] ?? "general";
    }
    return result;
  }, [categoryMap]);

  const hasDbData = tasks.length > 0 || completions.length > 0;

  // Compute weekly trend from real data (falls back to mock)
  const weeklyData = useMemo(() => {
    if (!hasDbData) return MOCK_WEEKLY_DATA;
    return computeWeeklyTrend(completions, tasks, today);
  }, [hasDbData, completions, tasks, today]);

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">סטטיסטיקה</h1>
        <Link
          href="/history"
          className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full font-medium"
          aria-label="עבור להיסטוריית משימות"
        >
          <History className="w-3.5 h-3.5" />
          היסטוריה
        </Link>
      </div>

      {/* Dashboard Analytics - shown when DB data is available */}
      {hasDbData && (
        <DashboardStats
          tasks={tasks}
          completions={completions}
          categoryNameToKey={categoryIdToKey}
          today={today}
        />
      )}

      {/* Weekly Completion Trend Chart */}
      <div className="bg-surface rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">מגמת השלמה שבועית</h2>
          <span className="text-[10px] text-muted bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {hasDbData ? "נתונים אמיתיים" : "נתוני הדגמה"}
          </span>
        </div>
        <div className="h-48" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E7E5E4",
                  fontSize: 12,
                  direction: "rtl",
                }}
                formatter={(value) => [`${value} משימות`, "הושלמו"]}
                labelFormatter={(label) => `יום ${label}`}
              />
              <Bar
                dataKey="completed"
                fill="#4F46E5"
                radius={[4, 4, 0, 0]}
                name="הושלמו"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Calendar */}
      <MonthlyCalendar tasks={tasks} completions={completions} today={today} />

      {/* Category Breakdown */}
      <div className="bg-surface rounded-2xl p-4">
        <h2 className="font-semibold text-sm mb-4">חלוקה לפי קטגוריה</h2>
        <div className="flex items-center gap-4">
          <div className="w-36 h-36" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {CATEGORY_DATA.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={getCategoryColor(entry.category)}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5">
            {CATEGORY_DATA.map((entry) => (
              <div
                key={entry.category}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getCategoryColor(entry.category) }}
                />
                <span className="text-foreground">
                  {getCategoryLabel(entry.category)}
                </span>
                <span className="text-muted mr-auto">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-surface rounded-2xl p-4">
        <h2 className="font-semibold text-sm mb-3">השוואה השבוע</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted mb-1">אני</p>
            <p className="text-2xl font-bold text-primary">48</p>
            <p className="text-xs text-muted">משימות</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted mb-1">השותף/ה</p>
            <p className="text-2xl font-bold text-primary-light">42</p>
            <p className="text-xs text-muted">משימות</p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-sm">הישגים</h2>
          <span className="text-xs text-muted">
            {UNLOCKED_ACHIEVEMENTS.length}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = UNLOCKED_ACHIEVEMENTS.includes(achievement.code);
            return (
              <motion.div
                key={achievement.code}
                className={`bg-surface rounded-xl p-3 text-center ${
                  unlocked ? "" : "opacity-40 grayscale"
                }`}
                whileTap={unlocked ? { scale: 0.95 } : undefined}
              >
                <span className="text-2xl block mb-1">{achievement.icon}</span>
                <p className="text-[10px] font-medium text-foreground leading-tight">
                  {achievement.title}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
