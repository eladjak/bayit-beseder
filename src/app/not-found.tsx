import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הדף לא נמצא",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6" dir="rtl">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🏠</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          הדף לא נמצא
        </h1>
        <p className="text-muted text-sm mb-6">
          נראה שהגעתם לכתובת שלא קיימת. אבל אל דאגה — הבית בסדר!
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2.5 rounded-xl gradient-primary text-white font-medium text-sm"
        >
          חזרה לדאשבורד
        </Link>
      </div>
    </div>
  );
}
