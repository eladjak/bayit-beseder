"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Calendar, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { useZoneConfig } from "@/hooks/useZoneConfig";
import { ZoneDaySummary } from "@/components/weekly/zone-day-summary";
import { useCompletions } from "@/hooks/useCompletions";
import { isRecurring } from "@/lib/task-flags";
import { useCopy } from "@/hooks/useCopy";
import honestyCopy from "@/lib/i18n/fragments/honesty-weekly-stats";
import { useTasks } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { usePartner } from "@/hooks/usePartner";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import dynamic from "next/dynamic";
import { useWeeklyGenerator } from "@/hooks/useWeeklyGenerator";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/upgrade-prompt";

const WeeklyGeneratorModal = dynamic(
  () =>
    import("@/components/weekly/weekly-generator-modal").then((m) => ({
      default: m.WeeklyGeneratorModal,
    })),
  { ssr: false }
);

import {
  analyzeDailyLoad,
  analyzeDailyLoadWithCalendar,
  generateSmartSuggestions,
  generateCalendarAwareSuggestions,
  getWeekRange,
  type Suggestion,
} from "@/lib/smart-scheduler";
import type { TaskRow } from "@/lib/types/database";
import { haptic } from "@/lib/haptics";
import { useTranslation } from "@/hooks/useTranslation";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/categories";
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
} from "@dnd-kit/core";
import { WeeklyDayCard } from "@/components/weekly/weekly-day-card";
import { WeeklySmartSuggestions } from "@/components/weekly/weekly-smart-suggestions";
import { WeeklyZonePanel } from "@/components/weekly/weekly-zone-panel";
import { WeeklyStats } from "@/components/weekly/weekly-stats";
import { WeeklyHeader } from "@/components/weekly/weekly-header";

import { addDaysStr, ilDay, ilToday } from "@/lib/il-date";
import { useNewUi } from "@/hooks/useNewUi";
import WeeklyV2 from "@/screens/weekly/WeeklyV2";

export default function WeeklyPage() {
  const newUi = useNewUi();
  return newUi ? <WeeklyV2 /> : <WeeklyPageV1 />;
}

function WeeklyPageV1() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const todayStr = useMemo(() => ilToday(), []);
  const { partner } = usePartner(profile?.partner_id, todayStr);
  const { members: householdMembers } = useHouseholdMembers(
    profile?.household_id ?? null,
    todayStr
  );
  const [showSuggestions, setShowSuggestions] = useState(true);

  const { c } = useCopy(honestyCopy);
  const addAreaRef = useRef<HTMLDivElement>(null);
  const completingTasks = useRef(new Set<string>());
  const [completionError, setCompletionError] = useState<TaskRow | null>(null);

  const startOfWeek = useMemo(() => {
    // Sunday of the current week in Israel, as a local-midnight Date.
    const todayIl = ilToday();
    const sunday = addDaysStr(todayIl, -new Date(todayIl).getUTCDay());
    const [y, m, d] = sunday.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, []);

  const endOfWeek = useMemo(() => {
    const end = new Date(startOfWeek);
    end.setDate(end.getDate() + 6);
    return end;
  }, [startOfWeek]);

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

  const { tasks, loading, createTask, updateTask, refetch } = useTasks({});

  const { markComplete, undoComplete, isCompletedToday, refetch: refetchCompletions } = useCompletions({ limit: 500 });
  const { canUse } = useSubscription(profile?.household_id ?? null);
  const zoneConfig = useZoneConfig();
  const wizard = useWeeklyGenerator();
  const [showWizard, setShowWizard] = useState(false);
  const [showWizardUpgradePrompt, setShowWizardUpgradePrompt] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [wizardZoneMappings, setWizardZoneMappings] = useState(zoneConfig.zoneMappings);

  const handleOpenWizard = useCallback(() => {
    if (!profile) {
      toast.error(t("weekly.loginFirst"));
      return;
    }
    if (!canUse("wizard")) {
      setShowWizardUpgradePrompt(true);
      haptic("tap");
      return;
    }
    const memberIds =
      householdMembers.length > 0
        ? householdMembers.map((m) => m.id)
        : [profile.id, ...(profile.partner_id ? [profile.partner_id] : [])];

    const startStr = ilDay(startOfWeek);
    const endStr = ilDay(endOfWeek);
    const weekTasksForWizard = tasks.filter(
      (t) => t.due_date && t.due_date >= startStr && t.due_date <= endStr
    );

    setWizardZoneMappings(zoneConfig.zoneMappings);
    wizard.generate(weekTasksForWizard, memberIds, startOfWeek, zoneConfig.zoneMode);
    setShowWizard(true);
    haptic("tap");
  }, [profile, partner, householdMembers, tasks, startOfWeek, endOfWeek, wizard, zoneConfig.zoneMappings, zoneConfig.zoneMode, canUse, t]);

  const handleRegenerateWithZones = useCallback(() => {
    if (!profile) return;
    const memberIds =
      householdMembers.length > 0
        ? householdMembers.map((m) => m.id)
        : [profile.id, ...(profile.partner_id ? [profile.partner_id] : [])];

    const startStr = ilDay(startOfWeek);
    const endStr = ilDay(endOfWeek);
    const weekTasksForWizard = tasks.filter(
      (t) => t.due_date && t.due_date >= startStr && t.due_date <= endStr
    );

    haptic("tap");
    wizard.generate(weekTasksForWizard, memberIds, startOfWeek, true, wizardZoneMappings);
  }, [profile, householdMembers, tasks, startOfWeek, endOfWeek, wizard, wizardZoneMappings]);

  const wizardMembers = useMemo(() => {
    if (householdMembers.length > 0) {
      return householdMembers.map((m) => ({ id: m.id, name: m.name }));
    }
    const m: Array<{ id: string; name: string }> = [];
    if (profile) m.push({ id: profile.id, name: profile.name });
    if (profile?.partner_id && partner) {
      m.push({ id: profile.partner_id, name: partner.name });
    }
    return m;
  }, [householdMembers, profile, partner]);

  const handleApplyWizard = useCallback(async () => {
    const { created, errors } = await wizard.applyPlan();
    if (created > 0) {
      toast.success(`${created} ${t("weekly.tasksAddedToWeek")}`);
      haptic("success");
      await refetch();
    }
    if (errors.length > 0) {
      toast.error(`${t("weekly.addFailed")} (${errors.length}): ${errors[0]}`, {
        duration: 10000,
      });
    }
    if (created === 0 && errors.length === 0) {
      toast.info(t("weekly.weekFull"));
    }
  }, [wizard, refetch, t]);

  const isRealData = !loading;

  const weekTasks = useMemo(() => {
    if (loading) return [];
    const startStr = ilDay(startOfWeek);
    const endStr = ilDay(endOfWeek);
    return tasks.filter((t) => {
      if (!t.due_date) return false;
      return t.due_date >= startStr && t.due_date <= endStr;
    }).map((task) => isRecurring(task.recurring) && task.due_date === todayStr && isCompletedToday(task.id) ? { ...task, status: "completed" as const } : task);
  }, [tasks, loading, startOfWeek, endOfWeek, isCompletedToday, todayStr]);

  const dailyLoads = useMemo(
    () =>
      calendarConnected
        ? analyzeDailyLoadWithCalendar(weekTasks, calendarEvents, startOfWeek)
        : analyzeDailyLoad(weekTasks, startOfWeek),
    [weekTasks, calendarEvents, calendarConnected, startOfWeek]
  );

  const suggestions = useMemo(
    () =>
      calendarConnected
        ? generateCalendarAwareSuggestions(weekTasks, calendarEvents)
        : generateSmartSuggestions(weekTasks),
    [weekTasks, calendarEvents, calendarConnected]
  );

  const stats = useMemo(() => {
    const total = weekTasks.length;
    const completed = weekTasks.filter((t) => t.status === "completed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const myTasks = weekTasks.filter((t) => t.assigned_to === profile?.id);
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

  const memberNames = useMemo(() => {
    const map: Record<string, string> = {};
    if (profile) map[profile.id] = profile.name;
    if (profile?.partner_id && partner) map[profile.partner_id] = partner.name;
    return map;
  }, [profile, partner]);

  const memberIds = useMemo(() => {
    const ids: string[] = [];
    if (profile) ids.push(profile.id);
    if (profile?.partner_id) ids.push(profile.partner_id);
    return ids;
  }, [profile]);

  const handleReassignTask = useCallback(
    async (taskId: string, newUserId: string) => {
      if (taskId.startsWith("mock-")) return;
      haptic("tap");
      const ok = await updateTask(taskId, { assigned_to: newUserId });
      if (ok) toast.success(t("weekly.moved"));
      else toast.error(t("weekly.moveFailed"));
    },
    [updateTask, t]
  );

  const handleClaimTask = useCallback(
    async (taskId: string) => {
      if (!profile?.id || taskId.startsWith("mock-")) return;
      haptic("success");
      const ok = await updateTask(taskId, { assigned_to: profile.id });
      if (ok) {
        const taskTitle = weekTasks.find((t) => t.id === taskId)?.title ?? "";
        toast.success(t("tasks.claim.claimed").replace("{task}", taskTitle));
      } else {
        toast.error(t("weekly.moveFailed"));
      }
    },
    [profile, updateTask, weekTasks, t]
  );

  const handleUnclaimTask = useCallback(
    async (taskId: string) => {
      if (!profile?.id || taskId.startsWith("mock-")) return;
      haptic("tap");
      const ok = await updateTask(taskId, { assigned_to: null });
      if (ok) toast.success(t("tasks.claim.unclaimed"));
      else toast.error(t("weekly.moveFailed"));
    },
    [profile, updateTask, t]
  );

  const handleMoveTaskToDay = useCallback(
    async (taskId: string, newDate: string) => {
      if (taskId.startsWith("mock-")) return;
      haptic("success");
      const ok = await updateTask(taskId, { due_date: newDate });
      if (ok) toast.success(t("weekly.shifted"));
      else toast.error(t("weekly.shiftFailed"));
    },
    [updateTask, t]
  );

  const handleApplySuggestion = useCallback(
    async (suggestion: Suggestion) => {
      if (!suggestion.affectedDates || suggestion.affectedDates.length < 2) return;
      if (!isRealData) {
        toast.info(t("weekly.loginToApply"));
        return;
      }
      const [sourceDate, targetDate] =
        suggestion.type === "empty_day"
          ? [suggestion.affectedDates[1], suggestion.affectedDates[0]]
          : [suggestion.affectedDates[0], suggestion.affectedDates[1]];

      const sourceTasks = weekTasks.filter(
        (t) => t.due_date === sourceDate && t.status !== "completed"
      );
      if (sourceTasks.length === 0) {
        toast.info(t("weekly.noTasksToMove"));
        return;
      }
      const taskToMove = sourceTasks[sourceTasks.length - 1];
      haptic("tap");
      const ok = await updateTask(taskToMove.id, { due_date: targetDate });
      if (ok) toast.success(`"${taskToMove.title}" ${t("weekly.taskMovedSuccess")}`);
      else toast.error(t("weekly.moveError"));
    },
    [weekTasks, updateTask, isRealData, t]
  );

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

  const handleAddTask = useCallback(
    async (dueDate: string, title: string, categoryId: string) => {
      if (!profile?.id) {
        toast.error(t("weekly.loginFirst"));
        return false;
      }
      // household_id is injected by createTask (useTasks) — omit it here.
      const taskData = {
        title: title.trim(),
        category_id: categoryId,
        due_date: dueDate,
        status: "pending" as const,
        points: 10,
        recurring: false,
      };
      const result = await createTask(taskData);
      if (result) {
        haptic("success");
        toast.success(t("weekly.taskAdded"));
        return true;
      }
      toast.error(t("weekly.addFailed"));
      return false;
    },
    [profile?.id, createTask, t]
  );

  const handleToggleComplete = useCallback(
    async (task: TaskRow) => {
      if (completingTasks.current.has(task.id)) return;
      if (!profile?.id) { setCompletionError(task); return; }
      completingTasks.current.add(task.id);
      try {
      haptic("tap");
      const completed = task.status === "completed";
      const result = completed
        ? await undoComplete(task.id)
        : await markComplete({ taskId: task.id, userId: profile.id, recurring: isRecurring(task.recurring) });
      if (!result || (typeof result === "object" && result.id.startsWith("offline-"))) {
        setCompletionError(task);
        return;
      }
      setCompletionError(null);
      await Promise.all([refetch(), refetchCompletions()]);
      if (!completed) {
        haptic("success");
        toast.success(t("weekly.completed"));
      }
      } catch {
        setCompletionError(task);
      } finally {
        completingTasks.current.delete(task.id);
      }
    },
    [profile, markComplete, undoComplete, refetch, refetchCompletions, t]
  );
  const retryCompletion = () => { if (completionError) void handleToggleComplete(completionError); };

  const weekRange = getWeekRange(startOfWeek);

  return (
    <div className="space-y-5" dir="rtl">
      <WeeklyHeader
        weekRange={weekRange}
        stats={stats}
        zoneMode={zoneConfig.zoneMode}
        calendarConnected={calendarConnected}
        calendarEventsCount={calendarEvents.length}
        partnerName={partner?.name}
        onOpenWizard={handleOpenWizard}
        onToggleZoneMode={zoneConfig.toggleZoneMode}
        onOpenZonePicker={() => setShowZonePicker(true)}
      />

      <div className="px-4 space-y-5">
        {/* Weekly planning illustration */}
        <div className="bb-joy overflow-hidden">
          <Image
            src="/illustrations/weekly-plan.jpg"
            alt="תכנון שבועי"
            width={512}
            height={128}
            sizes="(max-width: 512px) 100vw, 512px"
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
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {t("weekly.calendarConnectTitle")}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                {t("weekly.calendarConnectDesc")}
              </p>
            </div>
            <a
              href="/settings"
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              {t("weekly.calendarConnectBtn")}
            </a>
          </div>
        )}

        {/* Wizard upgrade prompt — shown when free user clicks wizard CTA */}
        {showWizardUpgradePrompt && (
          <div className="relative">
            <UpgradePrompt
              feature="wizard"
              description={t("upgrade.wizardBlurDesc")}
            />
            <button
              type="button"
              onClick={() => setShowWizardUpgradePrompt(false)}
              className="absolute top-3 left-3 w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-white text-xs hover:bg-black/40 transition-colors"
              aria-label="סגור"
            >
              ✕
            </button>
          </div>
        )}

        {!loading && weekTasks.length === 0 && (
          <div className="card-elevated p-5 text-center">
            <p className="font-medium">{c("weeklyEmpty")}</p>
            <button type="button" className="mt-3 min-h-11 px-4 rounded-xl gradient-primary text-white" onClick={() => addAreaRef.current?.querySelector<HTMLButtonElement>(`button[aria-label="${t("weekly.addTaskToDay")}"]`)?.click()}>{c("weeklyAdd")}</button>
          </div>
        )}

        {/* Smart Suggestions Panel */}
        <WeeklySmartSuggestions
          suggestions={suggestions}
          isRealData={isRealData}
          showSuggestions={showSuggestions}
          onToggle={() => setShowSuggestions(!showSuggestions)}
          onApplySuggestion={handleApplySuggestion}
        />

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
          <div className="space-y-3" ref={addAreaRef}>
            {dailyLoads.map((dayLoad, idx) => (
              <div key={dayLoad.date}>
              <WeeklyDayCard
                dayLoad={dayLoad}
                index={idx}
                isRealData={isRealData}
                calendarEvents={eventsByDate.get(dayLoad.date) ?? []}
                memberNames={memberNames}
                memberIds={memberIds}
                currentUserId={profile?.id}
                isDragTarget={
                  activeDragTask !== null && activeDragTask.fromDate !== dayLoad.date
                }
                onAddTask={handleAddTask}
                onToggleComplete={handleToggleComplete}
                onReassignTask={handleReassignTask}
                onClaimTask={handleClaimTask}
                onUnclaimTask={handleUnclaimTask}
                zoneMode={zoneConfig.zoneMode}
              />
              {completionError && dayLoad.tasks.some((task) => task.id === completionError.id) && (
                <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-base text-red-800 dark:bg-red-950 dark:text-red-200">
                  <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
                  {c("completionError", { title: completionError.title })} <button type="button" className="underline min-h-11 px-2" onClick={retryCompletion}>{c("retry")}</button>
                </div>
              )}
              </div>
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeDragTask && (
              <div className="bg-primary/15 rounded-lg px-3 py-2 text-xs shadow-lg border-2 border-primary opacity-90 text-foreground">
                <span className="ms-1">
                  {CATEGORY_ICONS[(activeDragTask.task.category_id && activeDragTask.task.category_id in CATEGORY_LABELS ? activeDragTask.task.category_id : "general")] ?? "🏠"}
                </span>
                {activeDragTask.task.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* This Week's Summary */}
        {weekTasks.length > 0 && <WeeklyStats
          stats={stats}
          dailyLoads={dailyLoads}
          calendarConnected={calendarConnected}
          calendarEvents={calendarEvents}
          partnerName={partner?.name}
        />}
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
        showZoneStep={zoneConfig.zoneMode}
        zoneMappings={wizardZoneMappings}
        onZoneMappingsChange={setWizardZoneMappings}
        onRegenerateWithZones={handleRegenerateWithZones}
      />

      {/* Zone Day Picker Modal */}
      <WeeklyZonePanel
        show={showZonePicker}
        onClose={() => setShowZonePicker(false)}
        mappings={zoneConfig.zoneMappings}
        onMoveZone={(zone, day) =>
          zoneConfig.moveZone(zone as import("@/lib/categories").CategoryKey, day)
        }
      />
    </div>
  );
}
