"use client";

import { useEffect, useState } from "react";
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
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";

// Lazy-load the AI chat components to keep the initial bundle lean
const ChatFAB = dynamic(
  () => import("@/components/ai-chat/chat-fab").then((m) => ({ default: m.ChatFAB })),
  { ssr: false },
);

const ChatDrawer = dynamic(
  () => import("@/components/ai-chat/chat-drawer").then((m) => ({ default: m.ChatDrawer })),
  { ssr: false },
);

// Alopik v2 #1: Quick Love button (FAB). Lazy-loaded to keep initial bundle lean.
const QuickLoveButton = dynamic(
  () => import("@/components/quick-love-button").then((m) => ({ default: m.QuickLoveButton })),
  { ssr: false },
);

// Alopik v2 #2: Daily Surprise Box. Lazy-loaded.
const SurpriseBox = dynamic(
  () => import("@/components/surprise-box").then((m) => ({ default: m.SurpriseBox })),
  { ssr: false },
);

// Alopik v2 #3: Onboarding Wizard. Lazy-loaded.
const OnboardingWizard = dynamic(
  () => import("@/components/onboarding/onboarding-wizard").then((m) => ({ default: m.OnboardingWizard })),
  { ssr: false },
);

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss } = useNotifications();

  // Alopik v2 #3: Show onboarding wizard once per user (localStorage flag)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("bayit-onboarding-done-v1");
    if (!done) setOnboardingOpen(true);
  }, []);

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
      {/* Skip to main content — visible on keyboard focus, RTL-aware */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        דלג לתוכן הראשי
      </a>
      {/* Global utility bar — bell + language toggle, sticky top bar inside content flow */}
      <div className="sticky top-0 z-40 flex items-center gap-1.5 px-3 py-1.5 max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto justify-end">
        <LanguageToggle />
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          dismiss={dismiss}
        />
      </div>
      <NotificationBanner />
      <PWAInstallBanner />
      <ServiceWorkerRegistrar />
      <ServiceWorkerUpdateToast />
      <main id="main-content" className="pb-safe max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto lg:bg-background lg:min-h-dvh lg:shadow-xl lg:border-x lg:border-border/50">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />

      {/* AI Chat floating button */}
      <ChatFAB onClick={() => setChatOpen(true)} />

      {/* Alopik v2 #1: Quick Love floating button (bidirectional household member micro-recognition) */}
      <QuickLoveButton />

      {/* Alopik v2 #2: Daily Surprise Box (first task of day) */}
      <SurpriseBox />

      {/* Alopik v2 #3: Adult-toned onboarding wizard (once per user, re-trigger from settings) */}
      <OnboardingWizard
        open={onboardingOpen}
        onClose={() => {
          setOnboardingOpen(false);
          if (typeof window !== "undefined") {
            localStorage.setItem("bayit-onboarding-done-v1", "1");
          }
        }}
        onComplete={() => {
          setOnboardingOpen(false);
          if (typeof window !== "undefined") {
            localStorage.setItem("bayit-onboarding-done-v1", "1");
          }
        }}
      />

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
