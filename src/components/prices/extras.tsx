import type { CompareResponse, StoreResult } from "@/lib/prices/types";
import { formatMoney, formatPublished, storeKey } from "./format";

const CARD = "rounded-2xl border border-gray-200 dark:border-gray-700 bg-surface p-3";

export function SplitCard({ data }: { data: CompareResponse }) {
  const sp = data.split;
  if (!sp) return null;
  const all = [...data.ranked, ...data.otherStores];
  const find = (k: string): StoreResult | undefined => all.find((s) => storeKey(s) === k);
  const label = (k: string) => {
    const s = find(k);
    return s ? `${s.chainName} ${s.name}` : k;
  };
  const itemsFor = (side: "a" | "b") =>
    Object.entries(sp.pick)
      .filter(([, v]) => v === side)
      .map(([k]) => data.titles[k] ?? k);
  return (
    <section aria-label="לקנות בשני מקומות" className={CARD}>
      <h2 className="font-bold text-gray-900 dark:text-gray-100">לקנות בשני מקומות</h2>
      <p className="text-sm mt-1 text-gray-800 dark:text-gray-200">
        חיסכון של <span className="font-bold">{formatMoney(sp.saving)}</span> על {sp.itemCount} פריטים
      </p>
      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{sp.note}</p>
      {(["a", "b"] as const).map((side) => (
        <div key={side} className="mt-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
            {label(side === "a" ? sp.a : sp.b)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{itemsFor(side).join(", ") || "-"}</p>
        </div>
      ))}
    </section>
  );
}

export function OnlineSection({ data }: { data: CompareResponse }) {
  if (data.online.length === 0) return null;
  const total = data.items.length;
  return (
    <section aria-label="משלוח" className={CARD}>
      <h2 className="font-bold text-gray-900 dark:text-gray-100">משלוח</h2>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
        דמי משלוח ומינימום הזמנה: לא ידוע. אזור המשלוח לא נבדק. לא מדורג מול סניפים פיזיים.
      </p>
      <ul className="mt-2 space-y-2">
        {data.online.map((s) => {
          const pub = formatPublished(s.published);
          return (
            <li key={storeKey(s)} className="flex items-start justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 break-words">{s.chainName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  נמצאו {s.foundCount} מתוך {total}
                </p>
                {pub && <p className="text-xs text-gray-500">{pub}</p>}
              </div>
              <p className="font-bold shrink-0">{formatMoney(s.foundTotal)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function UnknownItems({ data }: { data: CompareResponse }) {
  if (data.unknownItems.length === 0) return null;
  return (
    <section aria-label="פריטים שלא זוהו" className={CARD}>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">לא זוהו ולא נכנסו להשוואה</p>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
        {data.unknownItems.map((k) => data.titles[k] ?? k).join(", ")}
      </p>
    </section>
  );
}

export function PricesFooter({ data }: { data: CompareResponse }) {
  return (
    <footer className="text-xs text-gray-600 dark:text-gray-400 space-y-2 pb-4">
      <p>
        המחירים מתוך קבצי שקיפות המחירים שהרשתות מפרסמות לפי חוק. מחיר מדף, בלי מבצעים ומועדונים. מלאי בסניף לא נבדק.
      </p>
      <ul className="space-y-0.5">
        {data.chains.map((c) => {
          const pub = formatPublished(c.lastOk);
          return (
            <li key={c.key}>
              {c.name}: {pub ? pub.replace("מחירים מ-", "עודכן ") : "אין עדכון"}
              {c.lastRunFailed && (
                <span className="text-amber-700 dark:text-amber-400"> (העדכון האחרון נכשל)</span>
              )}
            </li>
          );
        })}
      </ul>
      <p>מיקומים: © OpenStreetMap</p>
    </footer>
  );
}
