import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "דשבורד",
  description: "סקירה יומית של משימות הבית, נקודות, רצפים ומצב השותף/ה",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
