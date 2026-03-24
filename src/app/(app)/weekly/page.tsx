"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  TrendingUp,
  Clock,
  Users,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  X,
  Wand2,
  GripVertical,
  ArrowLeftRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useZoneConfig } from "@/hooks/useZoneConfig";
import { ZoneGroupCard } from "@/components/weekly/zone-group";
import { ZoneDaySummary } from "@/components/weekly/zone-day-summary";
import { ZoneDayPicker } from "@/components/weekly/zone-day-picker";
import { getZoneInfo, type ZoneGroup } from "@/lib/zones";
import { CATEGORY_NAME_TO_KEY } from "@/lib/categories";
import { useTasks } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { usePartner } from "@/hooks/usePartner";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import dynamic from "next/dynamic";
import { useWeeklyGenerator } from "@/hooks/useWeeklyGenerator";

// Lazy-load the heavy wizard modal (includes @dnd-kit, recharts-like previews)
const WeeklyGeneratorModal = dynamic(() => import("@/components/weekly/weekly-generator-modal").then(m => ({ default: m.WeeklyGeneratorModal })), { ssr: false });
import {
  analyzeDailyLoad,
  analyzeDailyLoadWithCalendar,
  generateSmartSuggestions,
  generateCalendarAwareSuggestions,
  getWeekRange,
  type DayLoad,
  type DayLoadWithCalendar,
  type Suggestion,
} from "@/lib/smart-scheduler";
import type { ClientCalendarEvent } from "@/lib/types/calendar";
import type { TaskRow, TaskInsert } from "@/lib/types/database";
import { haptic } from "@/lib/haptics";
import {
  CATEGORY_BG_CLASSES,
  CATEGORY_LABELS,
  CATEGORY_KEYS,
  CATEGORY_ICONS,
} from "@/lib/categories";
import { CalendarEventItem } from "@/components/weekly/calendar-event-item";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";

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
  // Generate mock data once (client-side only) to avoid SSR/client Math.random() mismatch.
  const mockTasksRef = useRef<ReturnType<typeof generateMockWeeklyTasks> | null>(null);
  if (mockTasksRef.current === null) {
    mockTasksRef.current = generateMockWeeklyTasks();
  }

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

  // Fetch calendar events for this week
  const {
    events: calendarEvents,
    eventsByDate,
    loading: calendarLoading,
    connected: calendarConnected,
  } = useCalendarEvents({
    timeMin: startOfWeek.toISOString(),
    timeMax: new Date(endOfWeek.getTime() + 86400000).toISOString(),
    enabled: !!profile,
  });

  // Fetch tasks for this week with write capability
  const { tasks, loading, createTask, updateTask, refetch } = useTasks({});

  // Zone-based view
  const zoneConfig = useZoneConfig();

  // Weekly generator wizard
  const wizard = useWeeklyGenerator();
  const [showWizard, setShowWizard] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);

  const handleOpenWizard = useCallback(() => {
    if (!profile) {
      toast.error("יש להתחבר כדי להשתמש באשף");
      return;
    }
    const memberIds = [profile.id];
    if (profile.partner_id) memberIds.push(profile.partner_id);

    const startStr = startOfWeek.toISOString().split("T")[0];
    const endStr = endOfWeek.toISOString().split("T")[0];
    const weekTasksForWizard = tasks.filter(
      (t) => t.due_date && t.due_date >= startStr && t.due_date <= endStr
    );

    wizard.generate(weekTasksForWizard, memberIds, startOfWeek, zoneConfig.zoneMode);
    setShowWizard(true);
    haptic("tap");
  }, [profile, partner, tasks, startOfWeek, endOfWeek, wizard]);

  const wizardMembers = useMemo(() => {
    const m: Array<{ id: string; name: string }> = [];
    if (profile) m.push({ id: profile.id, name: profile.name });
    if (profile?.partner_id && partner) {
      m.push({ id: profile.partner_id, name: partner.name });
    }
    return m;
  }, [profile, partner]);

  const handleApplyWizard = useCallback(async () => {
    const { created, errors } = await wizard.applyPlan();
    if (created > 0) {
      toast.success(`${created} משימות חדשות נוספו!`);
      haptic("success");
      await refetch();
    }
    if (errors.length > 0) {
      // Show the actual Supabase error so we can diagnose the issue
      toast.error(`שגיאה ב-${errors.length} משימות: ${errors[0]}`, {
        duration: 10000,
      });
    }
    if (created === 0 && errors.length === 0) {
      toast.info("אין משימות חדשות להוספה");
    }
  }, [wizard, refetch]);

  // Auto-seed tasks for authenticated users on first visit
  const seedAttempted = useRef(false);
  useEffect(() => {
    if (seedAttempted.current || loading || tasks.length > 0 || !profile) return;
    seedAttempted.current = true;
    fetch("/api/seed", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.seeded) {
          // Force page reload to get fresh data
          window.location.reload();
        }
      })
      .catch(() => {});
  }, [loading, tasks.length, profile]);

  // Whether we're in real-data mode (Supabase connected and returned tasks)
  const isRealData = !loading && tasks.length > 0;

  // Filter tasks for this week or use mock data
  const weekTasks = useMemo(() => {
    if (loading) return [];

    if (tasks.length === 0) {
      // No Supabase data - use stable mock (generated once to avoid SSR/client mismatch)
      return mockTasksRef.current ?? [];
    }

    const startStr = startOfWeek.toISOString().split("T")[0];
    const endStr = endOfWeek.toISOString().split("T")[0];

    return tasks.filter((t) => {
      if (!t.due_date) return false;
      return t.due_date >= startStr && t.due_date <= endStr;
    });
  }, [tasks, loading, startOfWeek, endOfWeek]);

  // Analyze daily loads (with calendar if connected)
  const dailyLoads = useMemo(
    () =>
      calendarConnected
        ? analyzeDailyLoadWithCalendar(weekTasks, calendarEvents, startOfWeek)
        : analyzeDailyLoad(weekTasks, startOfWeek),
    [weekTasks, calendarEvents, calendarConnected, startOfWeek]
  );

  // Generate smart suggestions (calendar-aware when connected)
  const suggestions = useMemo(
    () =>
      calendarConnected
        ? generateCalendarAwareSuggestions(weekTasks, calendarEvents)
        : generateSmartSuggestions(weekTasks),
    [weekTasks, calendarEvents, calendarConnected]
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

  // Build member name lookup for assignee display
  const memberNames = useMemo(() => {
    const map: Record<string, string> = {};
    if (profile) map[profile.id] = profile.name;
    if (profile?.partner_id && partner) map[profile.partner_id] = partner.name;
    return map;
  }, [profile, partner]);

  // All member IDs for reassignment toggle
  const memberIds = useMemo(() => {
    const ids: string[] = [];
    if (profile) ids.push(profile.id);
    if (profile?.partner_id) ids.push(profile.partner_id);
    return ids;
  }, [profile]);

  // Reassign a task to a different user
  const handleReassignTask = useCallback(
    async (taskId: string, newUserId: string) => {
      if (taskId.startsWith("mock-")) return;
      haptic("tap");
      const ok = await updateTask(taskId, { assigned_to: newUserId });
      if (ok) {
        toast.success("המשימה הועברה");
      } else {
        toast.error("שגיאה בהעברת המשימה");
      }
    },
    [updateTask]
  );

  // Move a task to a different day (for D&D)
  const handleMoveTaskToDay = useCallback(
    async (taskId: string, newDate: string) => {
      if (taskId.startsWith("mock-")) return;
      haptic("success");
      const ok = await updateTask(taskId, { due_date: newDate });
      if (ok) {
        toast.success("המשימה הועברה ליום אחר");
      } else {
        toast.error("שגיאה בהעברת המשימה");
      }
    },
    [updateTask]
  );

  // Apply a suggestion (move task from heavy day to lighter day)
  const handleApplySuggestion = useCallback(
    async (suggestion: Suggestion) => {
      if (!suggestion.affectedDates || suggestion.affectedDates.length < 2) return;
      if (!isRealData) {
        toast.info("יש להתחבר כדי ליישם המלצות");
        return;
      }

      const [sourceDate, targetDate] = suggestion.type === "empty_day"
        ? [suggestion.affectedDates[1], suggestion.affectedDates[0]] // heavy → empty
        : [suggestion.affectedDates[0], suggestion.affectedDates[1]]; // heavy → next day

      // Find the last non-completed task on the source day
      const sourceTasks = weekTasks.filter(
        (t) => t.due_date === sourceDate && t.status !== "completed"
      );
      if (sourceTasks.length === 0) {
        toast.info("אין משימות להעביר");
        return;
      }

      const taskToMove = sourceTasks[sourceTasks.length - 1];
      haptic("tap");
      const ok = await updateTask(taskToMove.id, { due_date: targetDate });
      if (ok) {
        toast.success(`"${taskToMove.title}" הועברה בהצלחה`);
      } else {
        toast.error("שגיאה בהעברת המשימה");
      }
    },
    [weekTasks, updateTask, isRealData]
  );

  // D&D state for dragging tasks between day cards
  const [activeDragTask, setActiveDragTask] = useState<{
    task: TaskRow;
    fromDate: string;
  } | null>(null);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDndDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.task && data?.fromDate) {
      setActiveDragTask({ task: data.task as TaskRow, fromDate: data.fromDate as string });
      haptic("tap");
    }
  }, []);

  const handleDndDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragTask(null);

      if (!over || !active.data.current) return;

      const taskId = active.data.current.taskId as string;
      const fromDate = active.data.current.fromDate as string;
      const toDate = over.id as string;

      if (fromDate !== toDate && !taskId.startsWith("mock-")) {
        handleMoveTaskToDay(taskId, toDate);
      }
    },
    [handleMoveTaskToDay]
  );

  const weekRange = getWeekRange(startOfWeek);

  // Handle adding a task for a specific day
  const handleAddTask = useCallback(
    async (dueDate: string, title: string, categoryId: string) => {
      if (!profile?.id) {
        toast.error("יש להתחבר כדי להוסיף משימות");
        return false;
      }

      const taskData: TaskInsert = {
        title: title.trim(),
        category_id: categoryId,
        due_date: dueDate,
        status: "pending",
        points: 10,
        recurring: false,
      };

      const result = await createTask(taskData);
      if (result) {
        haptic("success");
        toast.success("משימה נוספה בהצלחה");
        return true;
      } else {
        toast.error("שגיאה בהוספת המשימה");
        return false;
      }
    },
    [profile?.id, createTask]
  );

  // Handle toggling task completion
  const handleToggleComplete = useCallback(
    async (task: TaskRow) => {
      if (task.id.startsWith("mock-")) {
        toast.info("חיבור לסופאבייס נדרש לשינויים");
        return;
      }
      const newStatus = task.status === "completed" ? "pending" : "completed";
      haptic("tap");
      const ok = await updateTask(task.id, { status: newStatus });
      if (ok) {
        if (newStatus === "completed") {
          haptic("success");
          toast.success("כל הכבוד! משימה הושלמה");
        }
      } else {
        toast.error("שגיאה בעדכון המשימה");
      }
    },
    [updateTask]
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-hero mesh-overlay rounded-b-[2rem] px-4 pt-6 pb-5 overflow-hidden">
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">תכנון שבועי</h1>
            <p className="text-sm text-white/60 mt-0.5">{weekRange}</p>
            <p className="text-xs text-white/70 mt-1">פריסת המשימות שלכם לכל השבוע עם המלצות לאיזון</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Primary CTA: wizard button */}
            <button
              onClick={handleOpenWizard}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-primary text-sm font-bold shadow-lg active:scale-95 transition-transform"
              title="יצירת תוכנית שבועית"
            >
              <Wand2 className="w-4 h-4" />
              <span>יצירת תוכנית שבועית</span>
            </button>
            {/* Secondary controls row */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={zoneConfig.toggleZoneMode}
                className={`flex items-center gap-1 px-2.5 py-1.5 backdrop-blur-sm rounded-xl border transition-colors active:scale-95 ${
                  zoneConfig.zoneMode
                    ? "bg-white/30 border-white/30"
                    : "bg-white/12 border-white/10 hover:bg-white/20"
                }`}
                title={zoneConfig.zoneMode ? "תצוגת רשימה" : "תצוגת אזורים"}
              >
                {zoneConfig.zoneMode ? (
                  <LayoutGrid className="w-3.5 h-3.5 text-white" />
                ) : (
                  <List className="w-3.5 h-3.5 text-white" />
                )}
                <span className="text-[11px] font-medium text-white">
                  {zoneConfig.zoneMode ? "אזורים" : "רשימה"}
                </span>
              </button>
              {zoneConfig.zoneMode && (
                <button
                  onClick={() => setShowZonePicker(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/30 transition-colors active:scale-95"
                  title="הגדרת אזורים"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
                  <span className="text-[11px] font-medium text-white">אזורים</span>
                </button>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/12 backdrop-blur-sm rounded-xl border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-medium text-white">
                  {stats.total} משימות
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Week summary */}
        <div className={`grid gap-2 ${calendarConnected ? "grid-cols-4" : "grid-cols-3"}`}>
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
          {calendarConnected && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
              <div className="text-xs text-white/70 mb-0.5">יומן</div>
              <div className="text-lg font-bold text-white">
                {calendarEvents.length}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Weekly planning illustration */}
        <div className="card-elevated overflow-hidden">
          <Image
            src="/illustrations/weekly-plan.jpg"
            alt="תכנון שבועי"
            width={512}
            height={128}
            className="w-full h-32 object-cover"
          />
        </div>

        {/* Calendar connection prompt */}
        {profile && !calendarConnected && !calendarLoading && (
          <div className="card-elevated p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">חברו Google Calendar</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">ראו פגישות לצד המשימות לתכנון חכם יותר</p>
            </div>
            <a
              href="/settings"
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              חיבור
            </a>
          </div>
        )}

        {/* Mock mode banner - login prompt when not authenticated */}
        {!isRealData && !loading && (
          <div className="card-elevated p-4 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">מצב תצוגה בלבד</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">התחברו כדי לעדכן ולנהל משימות</p>
            <a href="/login" className="inline-block mt-2 px-4 py-1.5 rounded-lg gradient-primary text-white text-xs font-medium">התחברו עכשיו</a>
          </div>
        )}

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
                {suggestions.map((suggestion: Suggestion, idx: number) => {
                  const isActionable =
                    (suggestion.type === "heavy_day" || suggestion.type === "empty_day" || suggestion.type === "busy_calendar_day") &&
                    suggestion.affectedDates &&
                    suggestion.affectedDates.length >= 2;

                  return (
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
                          {isActionable && isRealData && (
                            <button
                              onClick={() => handleApplySuggestion(suggestion)}
                              className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors active:scale-95"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              העבר משימה
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        )}

        {/* Zone summary bar (when zone mode active) */}
        {zoneConfig.zoneMode && (
          <ZoneDaySummary summary={zoneConfig.zoneDaySummary} />
        )}

        {/* Day-by-Day View with D&D */}
        <DndContext
          sensors={dndSensors}
          collisionDetection={closestCenter}
          onDragStart={handleDndDragStart}
          onDragEnd={handleDndDragEnd}
        >
          <div className="space-y-3">
            {dailyLoads.map((dayLoad, idx) => (
              <DayCard
                key={dayLoad.date}
                dayLoad={dayLoad}
                index={idx}
                isRealData={isRealData}
                calendarEvents={eventsByDate.get(dayLoad.date) ?? []}
                memberNames={memberNames}
                memberIds={memberIds}
                isDragTarget={activeDragTask !== null && activeDragTask.fromDate !== dayLoad.date}
                onAddTask={handleAddTask}
                onToggleComplete={handleToggleComplete}
                onReassignTask={handleReassignTask}
                zoneMode={zoneConfig.zoneMode}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeDragTask && (
              <div className="bg-primary/15 rounded-lg px-3 py-2 text-xs shadow-lg border-2 border-primary opacity-90 text-foreground">
                <span className="ml-1">{CATEGORY_ICONS[getCategoryFromId(activeDragTask.task.category_id)] ?? "🏠"}</span>
                {activeDragTask.task.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>

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
                <span className="text-sm text-foreground">זמן משימות</span>
              </div>
              <div className="text-sm font-medium text-foreground">
                {dailyLoads.reduce((sum, d) => sum + d.totalMinutes, 0)} דקות
              </div>
            </div>

            {/* Calendar busyness */}
            {calendarConnected && calendarEvents.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-foreground">פגישות ביומן</span>
                </div>
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {calendarEvents.length} אירועים
                </div>
              </div>
            )}

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

      {/* Weekly Generator Modal */}
      <WeeklyGeneratorModal
        open={showWizard}
        onClose={() => setShowWizard(false)}
        plan={wizard.plan}
        state={wizard.state}
        applyProgress={wizard.applyProgress}
        members={wizardMembers}
        onStartEditing={wizard.startEditing}
        onMoveTask={wizard.moveTask}
        onRemoveTask={wizard.removeTask}
        onAddTask={wizard.addTask}
        onReassignTask={wizard.reassignTask}
        onApply={handleApplyWizard}
        onReset={wizard.reset}
      />

      {/* Zone Day Picker Modal */}
      <AnimatePresence>
        {showZonePicker && (
          <motion.div
            key="zone-picker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-4"
            onClick={() => setShowZonePicker(false)}
          >
            <motion.div
              key="zone-picker-card"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">הגדרת אזורים לימים</h2>
                <button
                  onClick={() => setShowZonePicker(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="סגור"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 pb-4">
                <ZoneDayPicker
                  mappings={zoneConfig.zoneMappings}
                  onChange={(updated) => {
                    updated.forEach((m) => {
                      if (m.preferredDays[0] !== undefined) {
                        zoneConfig.moveZone(m.zone, m.preferredDays[0]);
                      }
                    });
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DayCardProps {
  dayLoad: DayLoad | DayLoadWithCalendar;
  index: number;
  isRealData: boolean;
  calendarEvents: ClientCalendarEvent[];
  memberNames: Record<string, string>;
  memberIds: string[];
  isDragTarget: boolean;
  onAddTask: (dueDate: string, title: string, categoryId: string) => Promise<boolean>;
  onToggleComplete: (task: TaskRow) => Promise<void>;
  onReassignTask: (taskId: string, newUserId: string) => Promise<void>;
  zoneMode?: boolean;
}

function DayCard({ dayLoad, index, isRealData, calendarEvents, memberNames, memberIds, isDragTarget, onAddTask, onToggleComplete, onReassignTask, zoneMode }: DayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [saving, setSaving] = useState(false);

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

  const handleSaveTask = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const ok = await onAddTask(dayLoad.date, newTitle, newCategory);
    setSaving(false);
    if (ok) {
      setNewTitle("");
      setNewCategory("general");
      setShowAddForm(false);
      setExpanded(true);
    }
  };

  // Make this DayCard a droppable zone for D&D
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: dayLoad.date });

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic("tap");
    setShowAddForm((prev) => !prev);
    setExpanded(true);
  };

  const handleCancelAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddForm(false);
    setNewTitle("");
    setNewCategory("general");
  };

  return (
    <motion.div
      ref={setDropRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`card-elevated overflow-hidden transition-all ${
        isOver
          ? "ring-2 ring-primary bg-primary/5"
          : isDragTarget
            ? "ring-1 ring-primary/30"
            : ""
      } ${
        dayLoad.isHeavy && !isOver
          ? "ring-2 ring-red-200 dark:ring-red-800/50 shadow-lg shadow-red-500/10"
          : !isOver
            ? "shadow-lg shadow-purple-500/10 border border-purple-100/50 dark:border-purple-800/30"
            : ""
      }`}
    >
      {/* Day header row */}
      <div className="flex items-center w-full">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 p-4 text-right"
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
            <div className="flex flex-wrap gap-1 items-center">
              {calendarEvents.length > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                  {calendarEvents.length} פגישות
                </span>
              )}
              {Array.from(
                new Set(
                  dayLoad.tasks.map((t) => getCategoryFromId(t.category_id))
                )
              )
                .slice(0, 4)
                .map((category) => (
                  <span key={category} className="text-xs">{CATEGORY_ICONS[category] ?? "🏠"}</span>
                ))}
              {dayLoad.tasks.length > 4 && (
                <div className="text-xs text-muted">+{dayLoad.tasks.length - 4}</div>
              )}
            </div>
          )}
        </button>

        {/* Quick-add button */}
        {isRealData && (
          <button
            onClick={handleAddButtonClick}
            className={`flex-shrink-0 ml-2 mr-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              showAddForm
                ? "bg-primary text-white"
                : "bg-border/30 text-muted hover:bg-primary/10 hover:text-primary"
            }`}
            title="הוסף משימה ליום זה"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Inline add-task form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 space-y-2 border-t border-border/20">
              {/* Title input */}
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTask();
                  if (e.key === "Escape") {
                    setShowAddForm(false);
                    setNewTitle("");
                  }
                }}
                placeholder="משימה חדשה..."
                dir="rtl"
                autoFocus
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted"
              />

              {/* Category selector */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_KEYS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      newCategory === cat
                        ? "bg-primary text-white"
                        : "bg-border/20 text-muted hover:bg-border/40"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_BG_CLASSES[cat]}`}
                    />
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-border/20 text-muted hover:bg-border/40 transition-colors"
                >
                  <X className="w-3 h-3" />
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleSaveTask}
                  disabled={!newTitle.trim() || saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  {saving ? "שומר..." : "הוסף"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded task list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {/* Calendar events */}
              {calendarEvents.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    פגישות ביומן ({calendarEvents.length})
                  </div>
                  {calendarEvents.map((event, eventIdx) => (
                    <CalendarEventItem key={event.id} event={event} index={eventIdx} />
                  ))}
                </div>
              )}

              {dayLoad.tasks.length === 0 && calendarEvents.length === 0 && (
                <div className="text-xs text-muted text-center py-2">
                  אין משימות או פגישות ליום זה
                </div>
              )}

              {/* Zone-grouped view */}
              {zoneMode && dayLoad.tasks.length > 0 && (() => {
                // Group tasks by category (= zone)
                const zoneGroups = new Map<string, TaskRow[]>();
                for (const task of dayLoad.tasks) {
                  const catKey = getCategoryFromId(task.category_id);
                  const existing = zoneGroups.get(catKey) ?? [];
                  existing.push(task);
                  zoneGroups.set(catKey, existing);
                }

                return Array.from(zoneGroups.entries()).map(([catKey, zoneTasks]) => {
                  const info = getZoneInfo(catKey as import("@/lib/categories").CategoryKey);
                  const zoneData: ZoneGroup = {
                    zone: catKey as import("@/lib/categories").CategoryKey,
                    label: info.label,
                    icon: info.icon,
                    color: info.color,
                    tasks: zoneTasks.map((t) => ({
                      title: t.title,
                      assignee: t.assigned_to,
                      estimated_minutes: 10,
                      completed: t.status === "completed",
                      taskId: t.id,
                    })),
                    totalMinutes: zoneTasks.length * 10,
                  };

                  return (
                    <ZoneGroupCard key={catKey} zone={zoneData}>
                      {zoneTasks.map((task) => (
                        <DraggableWeekTask
                          key={task.id}
                          task={task}
                          date={dayLoad.date}
                          memberNames={memberNames}
                          memberIds={memberIds}
                          onToggleComplete={onToggleComplete}
                          onReassignTask={onReassignTask}
                        />
                      ))}
                    </ZoneGroupCard>
                  );
                });
              })()}

              {/* Flat view (default) */}
              {!zoneMode && dayLoad.tasks.map((task) => (
                <DraggableWeekTask
                  key={task.id}
                  task={task}
                  date={dayLoad.date}
                  memberNames={memberNames}
                  memberIds={memberIds}
                  onToggleComplete={onToggleComplete}
                  onReassignTask={onReassignTask}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// Draggable Task Item for Weekly D&D
// ============================================

function DraggableWeekTask({
  task,
  date,
  memberNames,
  memberIds,
  onToggleComplete,
  onReassignTask,
}: {
  task: TaskRow;
  date: string;
  memberNames: Record<string, string>;
  memberIds: string[];
  onToggleComplete: (task: TaskRow) => Promise<void>;
  onReassignTask: (taskId: string, newUserId: string) => Promise<void>;
}) {
  const category = getCategoryFromId(task.category_id);
  const isMock = task.id.startsWith("mock-");
  const isCompleted = task.status === "completed";

  // Make this task draggable (only for real DB tasks)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { task, fromDate: date, taskId: task.id },
    disabled: isMock,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  const assigneeName = task.assigned_to ? memberNames[task.assigned_to] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg bg-background/50 dark:bg-background/30 transition-opacity ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {/* D&D handle */}
      {!isMock && (
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 rounded touch-none cursor-grab active:cursor-grabbing text-muted/40 hover:text-muted flex-shrink-0"
          aria-label="גרור להעברה ליום אחר"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Completion checkbox */}
      <button
        onClick={() => onToggleComplete(task)}
        disabled={isMock}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          isCompleted
            ? "bg-green-500 border-green-500 text-white"
            : isMock
              ? "border-border/30 opacity-40 cursor-not-allowed"
              : "border-border/50 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
        }`}
        title={isCompleted ? "סמן כלא הושלם" : "סמן כהושלם"}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>

      <span className="text-sm flex-shrink-0">{CATEGORY_ICONS[category] ?? "🏠"}</span>
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm transition-all ${
            isCompleted ? "line-through text-muted" : "text-foreground"
          }`}
        >
          {task.title}
          {task.description?.startsWith("[pesach-") && (
            <span className="inline-flex items-center gap-0.5 mr-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              🫓 פסח
            </span>
          )}
        </div>
        <div className="text-xs text-muted">
          {CATEGORY_LABELS[category]}
        </div>
      </div>

      {/* Assignee badge — click to toggle between members */}
      {assigneeName && memberIds.length === 2 && !isMock && (
        <button
          onClick={() => {
            const otherId = memberIds.find((id) => id !== task.assigned_to);
            if (otherId) onReassignTask(task.id, otherId);
          }}
          className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors whitespace-nowrap flex-shrink-0"
          title="החלף שותף"
        >
          {assigneeName}
        </button>
      )}
      {assigneeName && memberIds.length < 2 && (
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary/70 font-medium whitespace-nowrap flex-shrink-0">
          {assigneeName}
        </span>
      )}
    </div>
  );
}
