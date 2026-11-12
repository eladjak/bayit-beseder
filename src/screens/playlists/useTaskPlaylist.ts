import type { PlaylistTask } from '@/lib/playlists';
import type { TaskRow } from '@/lib/types/database';

export const DEFAULT_MINUTES = 5;
export function playlistMinutes(tasks: PlaylistTask[]) {
  return Math.ceil(tasks.reduce((sum, task) => sum + task.durationSeconds, 0) / 60);
}
export function taskPlaylist(tasks: TaskRow[], today: string, completed = new Set<string>()) {
  return tasks.filter(task => task.due_date !== null && task.due_date <= today && (task.status === 'pending' || task.status === 'in_progress') && !completed.has(task.id))
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || a.created_at.localeCompare(b.created_at));
}
export function taskMinutes(task: TaskRow) {
  const value = (task as TaskRow & { estimated_minutes?: unknown }).estimated_minutes;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : DEFAULT_MINUTES;
}
export function israelToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
