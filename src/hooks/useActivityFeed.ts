"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

export interface ActivityItem {
  id: string;
  type: "task_completed" | "achievement_unlocked" | "challenge_completed" | "member_joined";
  userId: string;
  userName: string;
  avatarUrl: string | null;
  title: string;
  timestamp: Date;
  icon: string;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "עכשיו";
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: "a1",
    type: "task_completed",
    userId: "user1",
    userName: "אלעד",
    avatarUrl: null,
    title: "השלים: שטיפת כלים",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    icon: "✅",
  },
  {
    id: "a2",
    type: "task_completed",
    userId: "user2",
    userName: "ענבל",
    avatarUrl: null,
    title: "השלימה: ניקוי אמבטיה",
    timestamp: new Date(Date.now() - 32 * 60 * 1000),
    icon: "✅",
  },
  {
    id: "a3",
    type: "achievement_unlocked",
    userId: "user1",
    userName: "אלעד",
    avatarUrl: null,
    title: "פתח הישג: שלושה ברצף 🔥",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000),
    icon: "🏆",
  },
  {
    id: "a4",
    type: "task_completed",
    userId: "user2",
    userName: "ענבל",
    avatarUrl: null,
    title: "השלימה: כביסה",
    timestamp: new Date(Date.now() - 5 * 3600 * 1000),
    icon: "✅",
  },
  {
    id: "a5",
    type: "task_completed",
    userId: "user1",
    userName: "אלעד",
    avatarUrl: null,
    title: "השלים: הוצאת אשפה",
    timestamp: new Date(Date.now() - 86400 * 1000),
    icon: "✅",
  },
];

interface UseActivityFeedReturn {
  activities: ActivityItem[];
  isLoading: boolean;
  getRelativeTime: (date: Date) => string;
  refresh: () => Promise<void>;
}

export function useActivityFeed(): UseActivityFeedReturn {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setActivities(MOCK_ACTIVITIES);
        setIsLoading(false);
        return;
      }

      // Fetch last 20 completions (no FK joins — avoids 400 if relations missing)
      const { data, error } = await supabase
        .from("task_completions")
        .select("id, task_id, user_id, completed_at")
        .order("completed_at", { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) {
        setActivities(MOCK_ACTIVITIES);
        setIsLoading(false);
        return;
      }

      // Fetch task titles and profile info in parallel
      const taskIds = [...new Set(data.map((r) => r.task_id))];
      const userIds = [...new Set(data.map((r) => r.user_id))];

      const [tasksRes, profilesRes] = await Promise.all([
        supabase.from("tasks").select("id, title").in("id", taskIds),
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds),
      ]);

      const taskMap = new Map((tasksRes.data ?? []).map((t) => [t.id, t.title]));
      const profileMap = new Map(
        (profilesRes.data ?? []).map((p) => [p.id, { name: p.display_name, avatar: p.avatar_url }])
      );

      const items: ActivityItem[] = data.map((row) => {
        const taskTitle = taskMap.get(row.task_id) ?? "משימה";
        const profile = profileMap.get(row.user_id);

        return {
          id: row.id,
          type: "task_completed" as const,
          userId: row.user_id,
          userName: profile?.name ?? "משתמש",
          avatarUrl: profile?.avatar ?? null,
          title: `השלים/ה: ${taskTitle}`,
          timestamp: new Date(row.completed_at),
          icon: "✅",
        };
      });

      setActivities(items);
    } catch {
      setActivities(MOCK_ACTIVITIES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, isLoading, getRelativeTime, refresh: fetchActivities };
}
