/** Select the earliest overdue task, then today's, then the oldest remaining task. */
export function chooseNextTask<T extends { due_date: string | null; created_at: string }>(tasks: T[], today: string): T | undefined {
  return [...tasks].sort((a, b) => {
    const rank = (date: string | null) => date && date < today ? 0 : date === today ? 1 : 2;
    const difference = rank(a.due_date) - rank(b.due_date);
    if (difference) return difference;
    if (rank(a.due_date) === 0 && a.due_date !== b.due_date) return (a.due_date ?? "").localeCompare(b.due_date ?? "");
    return a.created_at.localeCompare(b.created_at);
  })[0];
}

/** Quiet hours use Israel civil time, including the fixed Friday Shabbat fallback. */
export function isQuietTime(date: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  const day = get('weekday');
  return minutes < 7 * 60 || minutes >= 22 * 60 || day === 'Sat' || (day === 'Fri' && minutes >= 15 * 60 + 30);
}
