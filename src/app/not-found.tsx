import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הדף לא נמצא | בית בסדר",
};

export default function NotFound() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center p-6 bg-background"
      dir="rtl"
      lang="he"
    >
      <div className="text-center max-w-sm w-full">
        {/* Illustration */}
        <div className="relative mx-auto w-32 h-32 mb-6">
          <div className="text-8xl leading-none select-none" aria-hidden="true">
            🏠
          </div>
          <div
            className="absolute -top-1 -left-1 text-3xl animate-bounce"
            aria-hidden="true"
          >
            ❓
          </div>
        </div>

        {/* Status code */}
        <p className="text-6xl font-black text-primary/20 mb-2 tabular-nums">
          404
        </p>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-foreground mb-3">
          הדף לא נמצא
        </h1>

        {/* Description */}
        <p className="text-muted text-sm mb-8 leading-relaxed">
          נראה שהגעתם לכתובת שלא קיימת.
          <br />
          אבל אל דאגה — הבית בסדר! 😊
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl gradient-primary text-white font-semibold text-sm shadow-md shadow-primary/20 active:scale-95 transition-transform"
          >
            <span>🏡</span>
            <span>לדף הבית</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-surface border border-border text-foreground font-medium text-sm hover:bg-surface-hover active:scale-95 transition-all"
          >
            <span>📋</span>
            <span>לדשבורד</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
