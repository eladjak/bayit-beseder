import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "סטטיסטיקות",
  description: "סטטיסטיקות ודוחות — ביצועים אישיים, היסטוריה ומגמות שבועיות",
};

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
