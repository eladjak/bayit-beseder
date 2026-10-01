/**
 * Calendar days in Asia/Jerusalem. Never slice a UTC ISO string for a
 * "which day is it for the user" question: between 00:00 and 03:00 Israel time
 * the UTC date is still the previous day.
 */
const IL_TZ = "Asia/Jerusalem";
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: IL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD of an instant as seen in Israel. Accepts a Date or an ISO timestamp. */
export function ilDay(instant: Date | string | number): string {
  const d = instant instanceof Date ? instant : new Date(instant);
  return fmt.format(d);
}

/** Today's Israeli calendar date. */
export function ilToday(now: Date = new Date()): string {
  return ilDay(now);
}

/** Pure calendar arithmetic on a YYYY-MM-DD string (no timezone involved). */
export function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Israeli calendar date `days` away from today (negative = past). */
export function ilDayOffset(days: number, now: Date = new Date()): string {
  return addDaysStr(ilToday(now), days);
}

/** YYYY-MM-DD for a calendar cell (month is 0-based, day may overflow/underflow). Pure, no timezone. */
export function ymd(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}
