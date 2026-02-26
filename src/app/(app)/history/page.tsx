"use client";

import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useCompletions } from "@/hooks/useCompletions";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryColor, getCategoryLabel } from "@/lib/seed-data";
import type { TaskRow, TaskCompletionRow } from "@/lib/types/database";

// ============================================
// Map Hebrew category names -> internal keys
// ============================================
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

// ============================================
// Category Filter Bar
// ============================================

const CATEGORY_KEYS = [
  "kitchen",
  "bathroom",
  "living",
  "bedroom",
  "laundry",
  "outdoor",
  "pets",
  "general",
] as const;

interface CategoryFilterProps {
  selected: string | null;
  onChange: (key: string | null) => void;
}

function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" dir="rtl">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          selected === null
            ? "bg-primary text-white"
            : "bg-surface text-muted hover:text-foreground"
        }`}
      >
        הכל
      </button>
      {CATEGORY_KEYS.map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selected === key
              ? "text-white"
              : "bg-surface text-muted hover:text-foreground"
          }`}
          style={selected === key ? { backgroundColor: getCategoryColor(key) } : undefined}
        >
          {getCategoryLabel(key)}
        </button>
      ))}
    </div>
  );
}

// ============================================
// History Item
// ============================================

interface HistoryItemProps {
  task: TaskRow;
  completion: TaskCompletionRow;
  categoryKey: string;
}

function getRelativeDate(completedAt: string): string {
  const now = new Date();
  const completed = new Date(completedAt);
  const todayStr = now.toISOString().slice(0, 10);
  const completedDateStr = completed.toISOString().slice(0, 10);

  if (completedDateStr === todayStr) return "היום";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (completedDateStr === yesterday.toISOString().slice(0, 10)) return "אתמול";

  const diffMs = now.getTime() - completed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "לפני שבוע" : `לפני ${weeks} שבועות`;
  }

  return completed.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function HistoryItem({ task, completion, categoryKey }: HistoryItemProps) {
  const color = getCategoryColor(categoryKey);
  const label = getCategoryLabel(categoryKey);

  const completedDate = new Date(completion.completed_at);
  const relativeDate = getRelativeDate(completion.completed_at);
  const dateStr = completedDate.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = completedDate.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-surface rounded-xl p-3.5 flex items-start gap-3">
      {/* Category dot */}
      <span
        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {label}
          </span>
          <span className="text-[11px] font-medium text-primary/80">{relativeDate}</span>
          <span className="text-[10px] text-muted" title={dateStr}>{timeStr}</span>
        </div>
        {completion.notes && (
          <p className="text-xs text-muted mt-1 italic">{completion.notes}</p>
        )}
      </div>
      {/* Points badge */}
      {task.points > 0 && (
        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mt-1">
          +{task.points}
        </span>
      )}
    </div>
  );
}

// ============================================
// Mock data for demo mode
// ============================================

interface MockHistoryEntry {
  task: TaskRow;
  completion: TaskCompletionRow;
  categoryKey: string;
}

function buildMockHistory(): MockHistoryEntry[] {
  const now = new Date();
  const makeDate = (daysAgo: number, hour = 9): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 30, 0, 0);
    return d.toISOString();
  };

  const mockTasks: TaskRow[] = [
    { id: "m1", title: "שטיפת כלים", description: null, category_id: "cat-kitchen", frequency: "daily", assigned_to: null, status: "completed", due_date: null, points: 10, recurring: true, created_at: makeDate(10) },
    { id: "m2", title: "ניקוי אמבטיה", description: null, category_id: "cat-bathroom", frequency: "weekly", assigned_to: null, status: "completed", due_date: null, points: 15, recurring: false, created_at: makeDate(9) },
    { id: "m3", title: "כביסה", description: null, category_id: "cat-laundry", frequency: "daily", assigned_to: null, status: "completed", due_date: null, points: 10, recurring: true, created_at: makeDate(7) },
    { id: "m4", title: "האכלת חתולים", description: null, category_id: "cat-pets", frequency: "daily", assigned_to: null, status: "completed", due_date: null, points: 5, recurring: true, created_at: makeDate(5) },
    { id: "m5", title: "ניקוי סלון", description: null, category_id: "cat-living", frequency: "weekly", assigned_to: null, status: "completed", due_date: null, points: 20, recurring: false, created_at: makeDate(3) },
    { id: "m6", title: "הוצאת אשפה", description: null, category_id: "cat-kitchen", frequency: "daily", assigned_to: null, status: "completed", due_date: null, points: 5, recurring: true, created_at: makeDate(2) },
    { id: "m7", title: "ניקוי מקרר", description: null, category_id: "cat-kitchen", frequency: "monthly", assigned_to: null, status: "completed", due_date: null, points: 25, recurring: false, created_at: makeDate(1) },
    { id: "m8", title: "ניקוי חדר שינה", description: null, category_id: "cat-bedroom", frequency: "weekly", assigned_to: null, status: "completed", due_date: null, points: 15, recurring: false, created_at: makeDate(0, 14) },
  ];

  const categoryMap: Record<string, string> = {
    "cat-kitchen": "kitchen",
    "cat-bathroom": "bathroom",
    "cat-laundry": "laundry",
    "cat-pets": "pets",
    "cat-living": "living",
    "cat-bedroom": "bedroom",
  };

  return mockTasks.map((task, i) => ({
    task,
    completion: {
      id: `mc${i}`,
      task_id: task.id,
      completed_by: "demo-user",
      household_id: null,
      user_id: "demo-user",
      completed_at: makeDate(mockTasks.length - 1 - i, 9 + i),
      photo_url: null,
      notes: null,
      created_at: makeDate(mockTasks.length - 1 - i, 9 + i),
    },
    categoryKey: categoryMap[task.category_id ?? ""] ?? "general",
  }));
}

// ============================================
// Main History Page
// ============================================

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder] = useState<"desc">("desc"); // newest first always

  // Fetch all tasks (no status filter - we need all to look up completions)
  const { tasks, loading: tasksLoading } = useTasks({});
  const { completions, loading: completionsLoading } = useCompletions({ limit: 200 });
  const { categoryMap } = useCategories();

  const loading = tasksLoading || completionsLoading;

  // Build a task lookup map
  const taskById = useMemo(() => {
    const map: Record<string, TaskRow> = {};
    for (const t of tasks) {
      map[t.id] = t;
    }
    return map;
  }, [tasks]);

  // Convert DB tasks category_id -> key using categoryMap + CATEGORY_NAME_TO_KEY
  const getCategoryKey = (categoryId: string | null): string => {
    if (!categoryId) return "general";
    const name = categoryMap[categoryId];
    return name ? (CATEGORY_NAME_TO_KEY[name] ?? "general") : "general";
  };

  // Determine whether to use DB data or mock
  const hasDbData = !loading && completions.length > 0;

  // Build list of history entries
  const dbEntries: MockHistoryEntry[] = useMemo(() => {
    if (!hasDbData) return [];
    return completions
      .map((c) => {
        const task = taskById[c.task_id];
        if (!task) return null;
        return {
          task,
          completion: c,
          categoryKey: getCategoryKey(task.category_id),
        };
      })
      .filter((e): e is MockHistoryEntry => e !== null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completions, taskById, categoryMap]);

  const mockEntries = useMemo(() => buildMockHistory(), []);

  const allEntries = hasDbData ? dbEntries : mockEntries;

  // Filter by category
  const filteredByCategory = useMemo(() => {
    if (!selectedCategory) return allEntries;
    return allEntries.filter((e) => e.categoryKey === selectedCategory);
  }, [allEntries, selectedCategory]);

  // Filter by search
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredByCategory;
    return filteredByCategory.filter((e) =>
      e.task.title.toLowerCase().includes(q)
    );
  }, [filteredByCategory, search]);

  // Sort by date (newest first)
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const diff =
        new Date(b.completion.completed_at).getTime() -
        new Date(a.completion.completed_at).getTime();
      return sortOrder === "desc" ? diff : -diff;
    });
  }, [filteredEntries, sortOrder]);

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">היסטוריית משימות</h1>
        <span className="text-xs text-muted bg-surface px-2.5 py-1 rounded-full">
          {sortedEntries.length} רשומות
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="חיפוש משימות..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface rounded-xl pr-9 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-primary/30"
          dir="rtl"
          aria-label="חיפוש במשימות שהושלמו"
        />
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted flex-shrink-0" aria-hidden="true" />
        <CategoryFilter
          selected={selectedCategory}
          onChange={setSelectedCategory}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface rounded-xl h-16 animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedEntries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-medium text-foreground">אין משימות להצגה</p>
          <p className="text-xs text-muted mt-1">
            {search || selectedCategory
              ? "נסו לשנות את הסינון"
              : "משימות שהושלמו יופיעו כאן"}
          </p>
        </div>
      )}

      {/* History List */}
      {!loading && sortedEntries.length > 0 && (
        <div className="space-y-2.5">
          {sortedEntries.map((entry) => (
            <HistoryItem
              key={entry.completion.id}
              task={entry.task}
              completion={entry.completion}
              categoryKey={entry.categoryKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
