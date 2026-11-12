export type Groupable = { id: string; due_date: string | null; status: string };
export function jerusalemDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function groupTasks<T extends Groupable>(tasks: T[], now = new Date()) {
  const today = jerusalemDay(now);
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (6 - date.getUTCDay()));
  const end = date.toISOString().slice(0, 10);
  const groups: Record<'today' | 'week' | 'later' | 'done', T[]> = { today: [], week: [], later: [], done: [] };
  for (const task of tasks) {
    if (task.status === 'completed') groups.done.push(task);
    else if (task.due_date && task.due_date <= today) groups.today.push(task);
    else if (task.due_date && task.due_date <= end) groups.week.push(task);
    else groups.later.push(task);
  }
  groups.today.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
  return groups;
}
