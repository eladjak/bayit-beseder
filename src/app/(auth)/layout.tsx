import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "התחברות",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
