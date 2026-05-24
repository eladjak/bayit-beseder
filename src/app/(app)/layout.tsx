"use client";

import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePetCollectionSync } from "@/hooks/usePetCollectionSync";
import { syncBackgroundCollectionWithStreak } from "@/lib/backgrounds";
import { registerKonamiListener } from "@/lib/easter-eggs";
import { toast } from "sonner";
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

// Alopik v2 Phase 2: Weekly Wheel of Fortune (Friday-Sat). Lazy-loaded.
const WeeklyWheel = dynamic(
  () => import("@/components/gamification/weekly-wheel").then((m) => ({ default: m.WeeklyWheel })),
  { ssr: false },
);

// Alopik v2 Phase 3 #7: Active pet badge in top utility bar.
const ActivePetBadge = dynamic(
  () => import("@/components/pets/active-pet-badge").then((m) => ({ default: m.ActivePetBadge })),
  { ssr: false },
);

// Alopik v2 Phase 3: Celebration toast for newly-unlocked pets/backgrounds.
const CelebrationToast = dynamic(
  () => import("@/components/celebration-toast").then((m) => ({ default: m.CelebrationToast })),
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

  // Alopik v2 Phase 3: auto-unlock pets + backgrounds when streak advances
  const { profile } = useProfile();
  const streak = profile?.streak ?? 0;
  const newPets = usePetCollectionSync(streak);
  const [newBgs, setNewBgs] = useState<readonly { id: string; emoji: string; name: string }[]>([]);
  useEffect(() => {
    const bgs = syncBackgroundCollectionWithStreak(streak);
    if (bgs.length > 0) setNewBgs(bgs);
  }, [streak]);

  const celebrationItems = useMemo(
    () => [
      ...newPets.map((p) => ({ id: `pet-${p.id}`, emoji: p.emoji, title: p.name })),
      ...newBgs.map((b) => ({ id: `bg-${b.id}`, emoji: b.emoji, title: b.name, subtitle: "רקע חדש נפתח" })),
    ],
    [newPets, newBgs],
  );

  // Easter egg: Konami code unlocks epic tier
  useEffect(() => {
    const cleanup = registerKonamiListener(() => {
      toast.success("🐉 קוד הקונאמי! פתחת את הדרקון והחדים-קרן! 🦄");
    });
    return cleanup;
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
        <ActivePetBadge onClick={() => router.push("/settings#pets")} />
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

      {/* Alopik v2 Phase 2: Weekly Wheel — appears Fri 14:00 → Sat night */}
      <WeeklyWheel />

      {/* Alopik v2 Phase 3: Celebration toast for new pet/background unlocks */}
      <CelebrationToast items={celebrationItems} />

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
