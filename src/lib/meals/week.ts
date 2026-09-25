function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Sunday of the week containing `from` (Israeli week starts Sunday). */
export function comingSunday(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** The 7 YYYY-MM-DD dates of the week starting at `weekStart` (a Sunday). */
export function weekDates(weekStart: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    out.push(formatDate(d));
  }
  return out;
}

/** ISO date string 30 days before `weekStart` — the lookback window for the repeat rule. */
export function historyStartDate(weekStart: Date): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() - 30);
  return formatDate(d);
}
