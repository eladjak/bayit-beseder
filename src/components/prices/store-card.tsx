"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { CompareResponse, StoreResult } from "@/lib/prices/types";
import { formatMoney, formatPublished } from "./format";

interface Props {
  store: StoreResult;
  data: CompareResponse;
  stale?: boolean;
  showCommon?: boolean;
  onPick: (item: { key: string; canonicalId: string }) => void;
  onUnpin: (canonicalId: string) => void;
}

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500";

export function StoreCard({ store, data, stale, showCommon = true, onPick, onUnpin }: Props) {
  const [open, setOpen] = useState(false);
  const published = formatPublished(store.published);
  const missing = store.missing ?? [];
  const total = data.items.length;
  return (
    <li className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full text-start p-3 flex items-start gap-3 ${FOCUS}`}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 break-words">
            {store.chainName} {store.name}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {store.city} · בערך {store.distanceKm.toFixed(1)} ק&quot;מ (מרכז העיר)
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            נמצאו {store.foundCount} מתוך {total}
          </p>
          {published && <p className="text-xs text-gray-500 dark:text-gray-400">{published}</p>}
          {stale && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              נתונים ישנים, לא נכללו בדירוג
            </p>
          )}
        </div>
        <div className="text-end shrink-0">
          {showCommon && store.commonTotal !== undefined && (
            <>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatMoney(store.commonTotal)}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">על הסל המשותף</p>
            </>
          )}
          <span className="inline-block mt-1 text-gray-500" aria-hidden>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>
      {missing.length > 0 && (
        <p className="px-3 pb-2 text-xs text-gray-600 dark:text-gray-400">
          לא נמצאו: {missing.map((k) => data.titles[k] ?? k).join(", ")}
        </p>
      )}
      {open && (
        <ul className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {data.items.map((it) => {
            const line = store.lines[it.key];
            const title = data.titles[it.key] ?? it.key;
            const cid = it.canonicalId;
            return (
              <li key={it.key} className="p-3 text-sm">
                <p className="font-medium text-gray-900 dark:text-gray-100">{title}</p>
                {line ? (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 space-y-0.5">
                    <p className="break-words">{line.name}</p>
                    <p>
                      {line.packs} × {formatMoney(line.price)} ={" "}
                      <span className="font-semibold">{formatMoney(line.cost)}</span>
                    </p>
                    {line.estimate && <p>הערכה לפי ק&quot;ג</p>}
                    {line.promo && (
                      <p>
                        <span className="inline-block rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5">
                          מבצע (לא נכלל בסכום): {line.promo}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">לא נמצא בסניף הזה</p>
                )}
                {cid && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {it.pinned ? (
                      <>
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">מוצר נבחר</span>
                        <button
                          type="button"
                          onClick={() => onUnpin(cid)}
                          className={`text-xs underline text-gray-700 dark:text-gray-300 ${FOCUS}`}
                          aria-label={`בטל בחירה של מוצר עבור ${title}`}
                        >
                          בטל בחירה
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPick({ key: it.key, canonicalId: cid })}
                        className={`text-xs rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-800 dark:text-gray-200 ${FOCUS}`}
                        aria-label={`בחר מוצר עבור ${title}`}
                      >
                        בחר מוצר
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
