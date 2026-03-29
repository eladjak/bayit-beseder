import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "קניות",
  description: "רשימת קניות משותפת עם 22 קטגוריות וסנכרון בזמן אמת",
};

export default function ShoppingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
