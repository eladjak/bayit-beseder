"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { AuthGuard } from "@/components/AuthGuard";
import { NotificationBanner } from "@/components/NotificationBanner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { ServiceWorkerUpdateToast } from "@/components/ServiceWorkerUpdateToast";
import { PageTransition } from "@/components/page-transition";
import { SupabaseProvider } from "@/components/SupabaseProvider";
import { PWAInstallBanner } from "@/components/pwa-install-banner";
import { LanguageToggle } from "@/components/language-toggle";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// Lazy-load the AI chat components to keep the initial bundle lean
const ChatFAB = dynamic(
  () => import("@/components/ai-chat/chat-fab").then((m) => ({ default: m.ChatFAB })),
  { ssr: false },
);

const ChatDrawer = dynamic(
  () => import("@/components/ai-chat/chat-drawer").then((m) => ({ default: m.ChatDrawer })),
  { ssr: false },
);

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useKeyboardShortcuts({
    onNewTask: () => router.push("/tasks"),
    onOpenAIChat: () => setChatOpen(true),
    onEscape: () => {
      if (chatOpen) setChatOpen(false);
      if (shortcutsOpen) setShortcutsOpen(false);
    },
    onShowHelp: () => setShortcutsOpen(true),
  });

  return (
    <div className="min-h-dvh bg-background lg:bg-muted/30">
      <NotificationBanner />
      <PWAInstallBanner />
      <ServiceWorkerRegistrar />
      <ServiceWorkerUpdateToast />
      <main className="pb-safe max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto lg:bg-background lg:min-h-dvh lg:shadow-xl lg:border-x lg:border-border/50">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />

      {/* Language toggle — fixed top-left */}
      <LanguageToggle />

      {/* AI Chat floating button */}
      <ChatFAB onClick={() => setChatOpen(true)} />

      {/* AI Chat drawer */}
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <AuthGuard allowDemo={true}>
        <AppLayoutInner>{children}</AppLayoutInner>
      </AuthGuard>
    </SupabaseProvider>
  );
}
