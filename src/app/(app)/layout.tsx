"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { BottomNav } from "@/components/bottom-nav";
import { AuthGuard } from "@/components/AuthGuard";
import { NotificationBanner } from "@/components/NotificationBanner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { PageTransition } from "@/components/page-transition";
import { SupabaseProvider } from "@/components/SupabaseProvider";
import { PWAInstallBanner } from "@/components/pwa-install-banner";

// Lazy-load the AI chat components to keep the initial bundle lean
const ChatFAB = dynamic(
  () => import("@/components/ai-chat/chat-fab").then((m) => ({ default: m.ChatFAB })),
  { ssr: false },
);

const ChatDrawer = dynamic(
  () => import("@/components/ai-chat/chat-drawer").then((m) => ({ default: m.ChatDrawer })),
  { ssr: false },
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <SupabaseProvider>
      <AuthGuard allowDemo={true}>
        <div className="min-h-dvh bg-background">
          <NotificationBanner />
          <PWAInstallBanner />
          <ServiceWorkerRegistrar />
          <main className="pb-safe max-w-lg mx-auto">
            <PageTransition>{children}</PageTransition>
          </main>
          <BottomNav />

          {/* AI Chat floating button */}
          <ChatFAB onClick={() => setChatOpen(true)} />

          {/* AI Chat drawer */}
          <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </AuthGuard>
    </SupabaseProvider>
  );
}
