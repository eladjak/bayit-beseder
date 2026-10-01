import type { CompareResponse, StoreResult } from "@/lib/prices/types";
import { formatMoney } from "./format";

interface Props {
  verdict: CompareResponse["verdict"];
  winner: StoreResult | null;
  totalItems: number;
}

/** Wording is driven only by `verdict`; never claims more than the data shows. */
export function VerdictCard({ verdict, winner, totalItems }: Props) {
  if (!verdict || !winner) {
    return (
      <section
        aria-label="מסקנה"
        className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-surface p-4"
      >
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          אין מספיק פריטים משותפים כדי לקבוע מי הזול
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          אפשר עדיין לעיין בסניפים למטה ולראות מה נמצא בכל אחד.
        </p>
      </section>
    );
  }
  const full = verdict.basis === "full";
  return (
    <section
      aria-label="מסקנה"
      className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4"
    >
      <p className="text-xs text-emerald-800 dark:text-emerald-300">
        {full
          ? "הסל הזול ביותר מבין הסניפים שנבדקו"
          : `הזול ביותר מבין הסניפים שנבדקו, על ${verdict.commonCount} פריטים שנמצאו בכל הסניפים (מתוך ${totalItems})`}
      </p>
      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
        {winner.chainName} {winner.name}
      </p>
      {!full && (
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          זו לא השוואה של כל הסל, רק של הפריטים המשותפים.
        </p>
      )}
      <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
        חיסכון של <span className="font-bold">{formatMoney(verdict.savingVsDearest)}</span> מול היקר ביותר
      </p>
    </section>
  );
}
