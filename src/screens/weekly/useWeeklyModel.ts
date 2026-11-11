import { addDaysStr, ilToday } from '@/lib/il-date';
export function weekDays(now = new Date()): string[] {
  const today = ilToday(now);
  const sunday = addDaysStr(today, -new Date(`${today}T00:00:00Z`).getUTCDay());
  return Array.from({ length: 7 }, (_, index) => addDaysStr(sunday, index));
}
