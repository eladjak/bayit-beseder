import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "משימות",
  description: "ניהול משימות תחזוקת הבית — הוספה, עריכה, סימון כהושלמו",
};

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
