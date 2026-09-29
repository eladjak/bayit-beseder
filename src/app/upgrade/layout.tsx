import type { Metadata } from "next";

// page.tsx is a client component (it posts to /api/sumit/checkout and reads
// the real subscription), so the route's metadata lives here instead.
export const metadata: Metadata = {
  title: "שדרגו ל-Plus | בית בסדר",
  description:
    "פתחו את כל היכולות של בית בסדר — אשף תכנון שבועי חכם, סטטיסטיקה מלאה, מצב פסח, וקטגוריות מותאמות אישית. 19₪ לחודש למשק בית.",
  robots: { index: false, follow: false },
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
