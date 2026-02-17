"use client";

import { BottomNav } from "@/components/bottom-nav";
import { AuthGuard } from "@/components/AuthGuard";
import { NotificationBanner } from "@/components/NotificationBanner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowDemo={true}>
      <div className="min-h-dvh bg-background">
        <NotificationBanner />
        <ServiceWorkerRegistrar />
        <main className="pb-safe max-w-lg mx-auto">{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
