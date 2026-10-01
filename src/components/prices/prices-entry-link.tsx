"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scale } from "lucide-react";

/** Entry button to the price-comparison screen; renders nothing unless the flag is on. */
export function PricesEntryLink() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/prices/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { enabled?: boolean } | null) => {
        if (alive) setEnabled(j?.enabled === true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!enabled) return null;
  return (
    <Link
      href="/shopping/prices"
      className="mt-2 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/10 text-xs text-white/90 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      <Scale className="w-3.5 h-3.5" aria-hidden /> השוואת מחירים
    </Link>
  );
}
