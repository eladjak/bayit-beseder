"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatMoney } from "./format";

export interface Candidate {
  chain: string;
  code: string;
  name: string;
  manufacturer: string;
  size: number | null;
  dim: string | null;
  weighted: boolean;
  avgPrice: number;
  stores: number;
}

interface Props {
  title: string;
  canonicalId: string;
  onChoose: (c: Candidate) => void;
  onClose: () => void;
}

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500";

export function CandidatesSheet({ title, canonicalId, onChoose, onClose }: Props) {
  const [list, setList] = useState<Candidate[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`/api/prices/candidates?canonicalId=${encodeURIComponent(canonicalId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad"))))
      .then((j: { candidates?: Candidate[] }) => {
        if (alive) setList(j.candidates ?? []);
      })
      .catch(() => {
        if (alive) setErr(true);
      });
    return () => {
      alive = false;
    };
  }, [canonicalId]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`בחירת מוצר: ${title}`}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[512px] max-h-[75dvh] overflow-y-auto rounded-t-3xl bg-white dark:bg-gray-900 p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">בחר מוצר: {title}</h2>
          <button type="button" onClick={onClose} aria-label="סגור" className={`p-2 ${FOCUS}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        {err ? (
          <p className="text-sm text-red-600">לא הצלחנו לטעון מוצרים. נסו שוב.</p>
        ) : !list ? (
          <div className="h-24 rounded-lg shimmer" />
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500">לא נמצאו מוצרים לבחירה.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {list.map((c) => (
              <li key={`${c.chain}:${c.code}`}>
                <button type="button" onClick={() => onChoose(c)} className={`w-full text-start py-2.5 ${FOCUS}`}>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{c.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {[cleanMaker(c.manufacturer), sizeLabel(c)].filter(Boolean).join(" · ")}
                    {c.avgPrice ? ` · בממוצע ${formatMoney(c.avgPrice)}` : ""} · ב-{c.stores} סניפים
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Chains sometimes publish "," or "לא ידוע" as the manufacturer. */
function cleanMaker(m: string | null | undefined): string {
  const t = (m ?? "").trim();
  return /[\p{L}\p{N}]/u.test(t) && t !== "לא ידוע" ? t : "";
}

function sizeLabel(c: Pick<Candidate, "size" | "dim" | "weighted">): string {
  if (c.weighted) return "לפי משקל";
  if (!c.size) return "";
  if (c.dim === "ml") return c.size >= 1000 ? `${c.size / 1000} ל'` : `${c.size} מ"ל`;
  if (c.dim === "g") return c.size >= 1000 ? `${c.size / 1000} ק"ג` : `${c.size} גרם`;
  if (c.dim === "u") return `${c.size} יח'`;
  return "";
}
