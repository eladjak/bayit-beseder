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

export type TaskSort = 'due' | 'room' | 'who' | 'newest';
export function sortTasks<T extends { due_date: string | null; category_id: string | null; assigned_to: string | null; created_at: string }>(tasks:T[], sort:TaskSort, rooms:Record<string,string> = {}, people:Record<string,string> = {}):T[] {
 return [...tasks].sort((a,b) => {
  if (sort === 'newest') return b.created_at.localeCompare(a.created_at);
  if (sort === 'due') return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
  const key = sort === 'room' ? 'category_id' : 'assigned_to';
  const labels = sort === 'room' ? rooms : people;
  return (labels[a[key] ?? ''] ?? a[key] ?? '\uffff').localeCompare(labels[b[key] ?? ''] ?? b[key] ?? '\uffff');
 });
}
