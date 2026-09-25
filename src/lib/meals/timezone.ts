/**
 * Small, dependency-free Asia/Jerusalem-aware time helpers.
 *
 * Israel is UTC+2 in winter and UTC+3 in summer (DST). This file exists
 * because a naive fixed UTC+2/+3 offset is exactly the bug class documented
 * in ~/.claude/rules/time-and-clocks.md — the offset MUST be computed per
 * date, not hardcoded, or every defrost reminder is wrong for half the year.
 */

const IL_TZ = "Asia/Jerusalem";

/**
 * Offset (in minutes) between Asia/Jerusalem local time and UTC, evaluated
 * AT `instant`. Positive = local time is ahead of UTC (e.g. +180 in summer).
 */
export function jerusalemOffsetMinutes(instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: IL_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/**
 * Build the real UTC instant for a given Asia/Jerusalem wall-clock time
 * (y-m-d hh:mm), DST-correct for the target date.
 */
export function jerusalemWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMin = jerusalemOffsetMinutes(guess);
  return new Date(guess.getTime() - offsetMin * 60_000);
}

/** Parse a YYYY-MM-DD date string plus an hour/minute into a UTC instant, IL-local. */
export function ilDateAndHourToUtc(isoDate: string, hour: number, minute = 0): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return jerusalemWallTimeToUtc(y, m, d, hour, minute);
}

/** Today's date (YYYY-MM-DD) as seen in Asia/Jerusalem, for a given instant. */
export function ilDateString(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IL_TZ }).format(instant);
}
