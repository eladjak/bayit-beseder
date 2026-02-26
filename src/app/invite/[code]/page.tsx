"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Loader2, UserPlus, Heart, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type PageState =
  | "loading"
  | "invalid"
  | "not_logged_in"
  | "already_in_household"
  | "own_household"
  | "ready_to_join"
  | "joining"
  | "success";

interface HouseholdInfo {
  householdName: string;
  ownerName: string | null;
  inviteCode: string;
}

function fireConfetti() {
  void confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors: ["#4F46E5", "#7C3AED", "#EC4899", "#F59E0B", "#10B981"],
  });
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [householdInfo, setHouseholdInfo] = useState<HouseholdInfo | null>(null);
  const [successData, setSuccessData] = useState<{
    householdName: string;
    partnerName: string | null;
  } | null>(null);

  // Validate code and check auth on mount
  useEffect(() => {
    if (!code) {
      setPageState("invalid");
      return;
    }

    async function init() {
      // Validate the invite code
      const res = await fetch(`/api/invite?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        setPageState("invalid");
        return;
      }

      const data = (await res.json()) as {
        valid: boolean;
        householdName: string;
        ownerName: string | null;
        inviteCode: string;
      };

      setHouseholdInfo({
        householdName: data.householdName,
        ownerName: data.ownerName,
        inviteCode: data.inviteCode,
      });

      // Check if user is logged in
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Store code so we can redirect back after login
        if (typeof window !== "undefined") {
          localStorage.setItem("bayit-pending-invite", code);
        }
        setPageState("not_logged_in");
        return;
      }

      // Check if user is already in a household
      const { data: profile } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", user.id)
        .single();

      if (profile?.household_id) {
        // Check if this is their own household
        const { data: membership } = await supabase
          .from("household_members")
          .select("role")
          .eq("household_id", profile.household_id)
          .eq("user_id", user.id)
          .single();

        // Fetch the invite code of their household to compare
        const { data: theirHousehold } = await supabase
          .from("households")
          .select("invite_code")
          .eq("id", profile.household_id)
          .single();

        if (theirHousehold?.invite_code === code) {
          setPageState(
            membership?.role === "owner" ? "own_household" : "already_in_household"
          );
        } else {
          setPageState("already_in_household");
        }
        return;
      }

      setPageState("ready_to_join");
    }

    void init();
  }, [code]);

  const handleJoin = useCallback(async () => {
    setPageState("joining");

    try {
      const res = await fetch("/api/invite/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        householdName?: string;
        partnerName?: string | null;
      };

      if (!res.ok) {
        if (data.error === "already_in_household") {
          toast.error("כבר אתם חלק מבית!");
          setPageState("already_in_household");
        } else if (data.error === "cannot_join_own_household") {
          setPageState("own_household");
        } else {
          toast.error("שגיאה בהצטרפות. נסו שוב.");
          setPageState("ready_to_join");
        }
        return;
      }

      setSuccessData({
        householdName: data.householdName ?? householdInfo?.householdName ?? "",
        partnerName: data.partnerName ?? householdInfo?.ownerName ?? null,
      });
      setPageState("success");
      fireConfetti();

      // Remove pending invite from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("bayit-pending-invite");
      }

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch {
      toast.error("שגיאה בחיבור לשרת");
      setPageState("ready_to_join");
    }
  }, [code, householdInfo, router]);

  const handleLoginRedirect = useCallback(() => {
    router.push(`/login`);
  }, [router]);

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden"
      dir="rtl"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-hero opacity-90" />

      {/* Floating decorations */}
      <div className="absolute top-20 right-10 w-20 h-20 rounded-full bg-white/10 animate-float" />
      <div
        className="absolute bottom-32 left-8 w-14 h-14 rounded-2xl bg-white/10 animate-float"
        style={{ animationDelay: "1s" }}
      />

      <div className="w-full max-w-sm flex flex-col items-center gap-5 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30">
            <Home className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">בית בסדר</h1>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl bg-white/90 backdrop-blur-xl p-6 shadow-xl border border-white/50">
          <AnimatePresence mode="wait">
            {pageState === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted">טוען...</p>
              </motion.div>
            )}

            {pageState === "invalid" && (
              <motion.div
                key="invalid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-4 space-y-3"
              >
                <div className="text-4xl">🏚️</div>
                <h2 className="text-lg font-bold text-foreground">
                  קישור לא תקין
                </h2>
                <p className="text-sm text-muted">
                  קוד ההזמנה אינו קיים או פג תוקפו.
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full py-3 gradient-primary text-white rounded-xl font-medium text-sm shadow-md shadow-primary/20"
                >
                  חזרה לאפליקציה
                </button>
              </motion.div>
            )}

            {pageState === "not_logged_in" && householdInfo && (
              <motion.div
                key="not_logged_in"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4"
              >
                <div className="text-4xl">🏠</div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {householdInfo.ownerName
                      ? `${householdInfo.ownerName} מזמין/ת אותך`
                      : "הוזמנתם לבית"}
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    לנהל את הבית יחד ב-
                    <span className="font-semibold text-foreground">
                      {householdInfo.householdName}
                    </span>
                  </p>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
                  <p className="text-xs text-muted mb-1">קוד הזמנה</p>
                  <code className="text-base font-mono font-bold text-primary tracking-widest">
                    {householdInfo.inviteCode}
                  </code>
                </div>

                <p className="text-sm text-muted">
                  יש להתחבר כדי להצטרף לבית
                </p>

                <button
                  onClick={handleLoginRedirect}
                  className="w-full flex items-center justify-center gap-2 py-3 gradient-primary text-white rounded-xl font-medium text-sm shadow-md shadow-primary/20"
                >
                  <LogIn className="w-4 h-4" />
                  התחברות / הרשמה
                </button>
              </motion.div>
            )}

            {pageState === "ready_to_join" && householdInfo && (
              <motion.div
                key="ready_to_join"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4"
              >
                <div className="text-4xl">🏠</div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {householdInfo.ownerName
                      ? `${householdInfo.ownerName} מזמין/ת אותך`
                      : "הוזמנתם לבית"}
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    לנהל את הבית יחד ב-
                    <span className="font-semibold text-foreground">
                      {" "}{householdInfo.householdName}
                    </span>
                  </p>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
                  <p className="text-xs text-muted mb-1">קוד הזמנה</p>
                  <code className="text-base font-mono font-bold text-primary tracking-widest">
                    {householdInfo.inviteCode}
                  </code>
                </div>

                <button
                  onClick={handleJoin}
                  className="w-full flex items-center justify-center gap-2 py-3 gradient-primary text-white rounded-xl font-medium text-sm shadow-md shadow-primary/20 active:scale-95 transition-transform"
                >
                  <UserPlus className="w-4 h-4" />
                  הצטרף/י לבית
                </button>
              </motion.div>
            )}

            {pageState === "joining" && (
              <motion.div
                key="joining"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted">מצטרף/ת לבית...</p>
              </motion.div>
            )}

            {pageState === "success" && successData && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="text-5xl"
                >
                  🎉
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    ברוכים הבאים!
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    {successData.partnerName
                      ? `אתם מחוברים עם ${successData.partnerName}`
                      : `הצטרפתם ל-${successData.householdName}`}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-primary">
                  <Heart className="w-5 h-5 fill-primary" />
                  <span className="text-sm font-medium">מנהלים את הבית יחד</span>
                  <Heart className="w-5 h-5 fill-primary" />
                </div>

                <p className="text-xs text-muted">מועברים לאפליקציה...</p>
              </motion.div>
            )}

            {(pageState === "already_in_household" || pageState === "own_household") && (
              <motion.div
                key="already"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4 py-2"
              >
                <div className="text-4xl">
                  {pageState === "own_household" ? "🏡" : "✅"}
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {pageState === "own_household"
                    ? "זהו הבית שלכם!"
                    : "כבר אתם בבית"}
                </h2>
                <p className="text-sm text-muted">
                  {pageState === "own_household"
                    ? "לא ניתן להצטרף לבית שיצרתם."
                    : "כבר אתם חלק מבית. לא ניתן להצטרף לבית נוסף."}
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full py-3 gradient-primary text-white rounded-xl font-medium text-sm shadow-md shadow-primary/20"
                >
                  חזרה לאפליקציה
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
