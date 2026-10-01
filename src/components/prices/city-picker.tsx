"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";

interface Props {
  cities: { name: string; stores: number }[];
  loading: boolean;
  onPick: (name: string) => void;
  onGeo: () => void;
  onClose?: () => void;
}

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500";

export function CityPicker({ cities, loading, onPick, onGeo, onClose }: Props) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim();
    return (s ? cities.filter((c) => c.name.includes(s)) : cities).slice(0, 60);
  }, [q, cities]);
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-surface p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-2 text-gray-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש יישוב"
            aria-label="חיפוש יישוב"
            className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent ps-8 pe-2 py-2 text-sm ${FOCUS}`}
          />
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="סגור" className={`p-2 rounded-lg ${FOCUS}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onGeo}
        className={`w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white py-2 text-sm font-medium ${FOCUS}`}
      >
        <MapPin className="w-4 h-4" aria-hidden /> השתמש במיקום שלי
      </button>
      {loading ? (
        <div className="h-24 rounded-lg shimmer" />
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500 py-2 text-center">לא נמצא יישוב</p>
      ) : (
        <ul className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {list.map((c) => (
            <li key={c.name}>
              <button
                type="button"
                onClick={() => onPick(c.name)}
                className={`w-full text-start py-2 px-1 text-sm flex justify-between ${FOCUS}`}
              >
                <span>{c.name}</span>
                <span className="text-xs text-gray-500">{c.stores} סניפים</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
