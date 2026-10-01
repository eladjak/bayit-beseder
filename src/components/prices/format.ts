export function formatMoney(n: number): string {
  return `${n.toFixed(2)} ₪`;
}

/** "מחירים מ-dd.mm HH:MM" in Israel time; null when the date is missing/invalid. */
export function formatPublished(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `מחירים מ-${get("day")}.${get("month")} ${get("hour")}:${get("minute")}`;
}

export function storeKey(s: { chain: string; storeId: string }): string {
  return `${s.chain}:${s.storeId}`;
}
