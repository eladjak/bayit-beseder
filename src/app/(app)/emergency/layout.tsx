import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מצב חירום",
  description: "מצב חירום — משימות דחופות ופעולות מהירות לניהול הבית",
};

export default function EmergencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
