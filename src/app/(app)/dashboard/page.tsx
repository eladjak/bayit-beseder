"use client";

import { useState, useCallback } from "react";
import { GoldenRuleRing } from "@/components/dashboard/golden-rule-ring";
import { TodayOverview, type TaskItem } from "@/components/dashboard/today-overview";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { PartnerStatus } from "@/components/dashboard/partner-status";
import { EmergencyToggle } from "@/components/dashboard/emergency-toggle";
import { CelebrationOverlay } from "@/components/gamification/celebration-overlay";
import { CoachingBubble } from "@/components/gamification/coaching-bubble";
import { getRandomMessage } from "@/lib/coaching-messages";

const MOCK_TASKS: TaskItem[] = [
  { id: "1", title: "שטיפת כלים / הפעלת מדיח", category: "kitchen", estimated_minutes: 15, completed: false },
  { id: "2", title: "האכלת חתולים (בוקר)", category: "pets", estimated_minutes: 5, completed: true },
  { id: "3", title: "הוצאת אשפה", category: "kitchen", estimated_minutes: 5, completed: false },
  { id: "4", title: "ניקוי משטחי עבודה במטבח", category: "kitchen", estimated_minutes: 5, completed: false },
  { id: "5", title: "סידור מהיר של הסלון", category: "living", estimated_minutes: 5, completed: true },
  { id: "6", title: "מים טריים לחתולים", category: "pets", estimated_minutes: 2, completed: false },
  { id: "7", title: "ניקוי ארגז חול", category: "pets", estimated_minutes: 5, completed: false },
  { id: "8", title: "איוורור הבית", category: "general", estimated_minutes: 2, completed: true },
];

function getHebrewDate(): string {
  return new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [celebration, setCelebration] = useState<{
    visible: boolean;
    type: "task" | "all_daily" | "golden_rule";
    message: string;
    emoji: string;
  }>({ visible: false, type: "task", message: "", emoji: "" });
  const [coaching, setCoaching] = useState<{
    visible: boolean;
    message: string;
    emoji: string;
  }>({ visible: false, message: "", emoji: "" });

  const completedCount = tasks.filter((t) => t.completed).length;
  const percentage = Math.round((completedCount / tasks.length) * 100);
  const target = emergencyMode ? 50 : 80;

  const handleToggle = useCallback(
    (taskId: string) => {
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        const newCompleted = updated.filter((t) => t.completed).length;
        const newPct = Math.round((newCompleted / updated.length) * 100);
        const wasCompleting = !prev.find((t) => t.id === taskId)?.completed;

        if (wasCompleting) {
          if (newCompleted === updated.length) {
            const msg = getRandomMessage("all_daily_done");
            setCelebration({
              visible: true,
              type: "all_daily",
              message: msg.message,
              emoji: msg.emoji,
            });
          } else if (newPct >= target && newPct - Math.round(((newCompleted - 1) / updated.length) * 100) > 0) {
            const prevPct = Math.round(((newCompleted - 1) / updated.length) * 100);
            if (prevPct < target) {
              const msg = getRandomMessage("golden_rule_hit");
              setCelebration({
                visible: true,
                type: "golden_rule",
                message: msg.message,
                emoji: msg.emoji,
              });
            } else {
              const msg = getRandomMessage("task_complete");
              setCelebration({
                visible: true,
                type: "task",
                message: msg.message,
                emoji: msg.emoji,
              });
            }
          } else {
            const msg = getRandomMessage("task_complete");
            setCelebration({
              visible: true,
              type: "task",
              message: msg.message,
              emoji: msg.emoji,
            });
          }
        }

        return updated;
      });
    },
    [target]
  );

  const dismissCelebration = useCallback(() => {
    setCelebration((prev) => ({ ...prev, visible: false }));
    const msg = getRandomMessage("task_complete");
    setCoaching({ visible: true, message: msg.message, emoji: msg.emoji });
    setTimeout(() => setCoaching((prev) => ({ ...prev, visible: false })), 3000);
  }, []);

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground">שלום! 👋</h1>
        <p className="text-sm text-muted">{getHebrewDate()}</p>
      </div>

      {/* Golden Rule Ring */}
      <div className="flex justify-center">
        <GoldenRuleRing percentage={percentage} target={target} />
      </div>

      {/* Streak */}
      <StreakDisplay count={5} bestCount={12} />

      {/* Today's Tasks */}
      <TodayOverview tasks={tasks} onToggle={handleToggle} />

      {/* Partner Status */}
      <div>
        <h2 className="font-semibold text-foreground px-1 mb-2">השותף/ה</h2>
        <PartnerStatus
          name="אינבל"
          completedCount={3}
          totalCount={8}
          recentTasks={[
            "החלפת מצעים",
            "כביסה",
            "ניקוי כיור אמבטיה",
          ]}
        />
      </div>

      {/* Emergency Toggle */}
      <EmergencyToggle
        active={emergencyMode}
        onToggle={() => setEmergencyMode((prev) => !prev)}
      />

      {/* Celebration Overlay */}
      <CelebrationOverlay
        type={celebration.type}
        message={celebration.message}
        emoji={celebration.emoji}
        visible={celebration.visible}
        onDismiss={dismissCelebration}
      />

      {/* Coaching Bubble */}
      <CoachingBubble
        visible={coaching.visible}
        message={coaching.message}
        emoji={coaching.emoji}
        onDismiss={() => setCoaching((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  );
}
