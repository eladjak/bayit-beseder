import { ilDateString } from '@/lib/meals/timezone';
export function todayMeal<T extends { date: string }>(days: T[], now: Date = new Date()): T | undefined {
  return days.find(day => day.date === ilDateString(now));
}
