import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הגדרות",
  description: "הגדרות חשבון, פרופיל, עיצוב והתראות",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
