"use client";

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setTimeout(() => setReduced(mq.matches), 0);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => { window.clearTimeout(timer); mq.removeEventListener("change", handler); };
  }, []);

  return reduced;
}
