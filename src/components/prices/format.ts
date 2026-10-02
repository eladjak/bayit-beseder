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

/** "dd.mm.yyyy" in Israel time; null when the date is missing/invalid. */
export function formatDayIL(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")}`;
}

/**
 * The date the comparison's data is "correct as of": the OLDEST successful
 * update among the chains that have one. Conservative on purpose: every price
 * shown is at least this fresh, so the line never overstates freshness.
 */
export function dataAsOf(chains: { lastOk: string | null }[]): string | null {
  let oldest: number | null = null;
  let oldestIso: string | null = null;
  for (const c of chains) {
    if (!c.lastOk) continue;
    const t = new Date(c.lastOk).getTime();
    if (Number.isNaN(t)) continue;
    if (oldest === null || t < oldest) {
      oldest = t;
      oldestIso = c.lastOk;
    }
  }
  return formatDayIL(oldestIso);
}

/** Attribution required by our legal note (workroom/bayit-price-data-legal-2026-10-02.md). */
export function priceAttribution(chains: { lastOk: string | null }[]): string {
  const day = dataAsOf(chains);
  const base = "מחירים לפי פרסום הרשתות לפי חוק שקיפות המחירים";
  return day ? `${base}, נכון ל-${day}.` : `${base}. תאריך העדכון אינו ידוע.`;
}

export const PRICE_DISCLAIMER =
  "המחירים עשויים להשתנות. ההשוואה לפי מחיר המדף; מבצעים ומחירי מועדון משתנים בין סניפים ואינם כלולים. המחיר הקובע הוא המחיר בקופה, ומלאי בסניף לא נבדק.";

export const NO_AFFILIATION = "בית בסדר אינו קשור לרשתות השיווק, ואינו פועל מטעמן או בשיתוף איתן.";
