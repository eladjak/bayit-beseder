"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.error("[Error Boundary]", error);
    }
  }, [error]);

  return (
    <div dir="rtl" lang="he" className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <div className="card-elevated p-8 text-center max-w-sm w-full">
        {/* Illustration */}
        <div className="text-5xl mb-4 select-none" aria-hidden="true">
          😕
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-foreground mb-2">
          משהו השתבש
        </h2>

        {/* Description */}
        <p className="text-sm text-muted mb-6 leading-relaxed">
          אירעה שגיאה לא צפויה.
          <br />
          אנחנו מצטערים על אי הנוחות.
        </p>

        {/* Error digest (production-safe identifier) */}
        {error.digest && (
          <p className="text-xs text-muted/60 font-mono mb-6 bg-surface rounded-lg px-3 py-1.5">
            קוד שגיאה: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-2.5 rounded-2xl gradient-primary text-white font-semibold text-sm shadow-md shadow-primary/20 active:scale-95 transition-transform"
          >
            נסו שוב
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-surface border border-border text-foreground font-medium text-sm hover:bg-surface-hover active:scale-95 transition-all"
          >
            <span>🏡</span>
            <span>חזרה לדף הבית</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
