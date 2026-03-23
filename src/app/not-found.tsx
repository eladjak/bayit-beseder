import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הדף לא נמצא",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6 bg-background" dir="rtl">
      <div className="text-center max-w-sm">
        <div className="text-8xl mb-6 animate-bounce">🏠</div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          404
        </h1>
        <h2 className="text-xl font-semibold text-foreground mb-3">
          הדף לא נמצא
        </h2>
        <p className="text-muted text-sm mb-8 leading-relaxed">
          נראה שהגעתם לכתובת שלא קיימת.
          <br />
          אבל אל דאגה — הבית בסדר! 😊
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-block px-6 py-2.5 rounded-xl gradient-primary text-white font-medium text-sm"
          >
            לדף הבית
          </Link>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2.5 rounded-xl bg-surface border border-border text-foreground font-medium text-sm hover:bg-surface-hover transition-colors"
          >
            לדשבורד
          </Link>
        </div>
      </div>
    </div>
  );
}
