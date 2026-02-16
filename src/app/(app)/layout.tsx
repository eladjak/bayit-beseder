import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <main className="pb-safe max-w-lg mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
