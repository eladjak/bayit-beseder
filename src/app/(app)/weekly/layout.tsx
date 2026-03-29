import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "תכנון שבועי",
  description: "תכנון שבועי חכם — אלגוריתם שמחלק משימות לפי אזורים, ימים ועומס",
};

export default function WeeklyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
