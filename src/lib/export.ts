/**
 * Data export utilities for BayitBeSeder
 * Supports CSV export with UTF-8 BOM for Hebrew Excel compatibility
 */

export interface ExportTask {
  id: string;
  title: string;
  category?: string | null;
  recurring: boolean;
  status: string;
  due_date?: string | null;
  created_at: string;
}

export interface ExportCompletion {
  task_id: string;
  task_title?: string;
  completed_at: string;
  user_name?: string;
}

/**
 * Escape a CSV cell value — wraps in quotes if it contains comma, newline, or quote
 */
function escapeCSV(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert frequency/recurring to Hebrew label
 */
function getFrequencyLabel(recurring: boolean): string {
  return recurring ? "חוזר" : "חד פעמי";
}

/**
 * Convert task status to Hebrew label
 */
function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "ממתין",
    in_progress: "בתהליך",
    completed: "הושלם",
    skipped: "דולג",
  };
  return map[status] ?? status;
}

/**
 * Export tasks to CSV string with UTF-8 BOM for Hebrew support in Excel
 */
export function exportTasksToCSV(tasks: ExportTask[]): string {
  const headers = ["שם משימה", "קטגוריה", "תדירות", "סטטוס", "תאריך יעד", "נוצר ב"];
  const rows = tasks.map((task) => [
    escapeCSV(task.title),
    escapeCSV(task.category ?? "כללי"),
    escapeCSV(getFrequencyLabel(task.recurring)),
    escapeCSV(getStatusLabel(task.status)),
    escapeCSV(task.due_date ?? ""),
    escapeCSV(task.created_at?.slice(0, 10) ?? ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  // UTF-8 BOM prefix for Hebrew/Excel compatibility
  return "\uFEFF" + csvContent;
}

/**
 * Export task completions to CSV string with UTF-8 BOM
 */
export function exportCompletionsToCSV(completions: ExportCompletion[]): string {
  const headers = ["שם משימה", "תאריך השלמה", "מבצע"];
  const rows = completions.map((c) => [
    escapeCSV(c.task_title ?? c.task_id),
    escapeCSV(c.completed_at?.slice(0, 16).replace("T", " ") ?? ""),
    escapeCSV(c.user_name ?? ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  return "\uFEFF" + csvContent;
}

/**
 * Trigger a CSV file download in the browser
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
