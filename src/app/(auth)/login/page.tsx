"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Home, Loader2, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { signIn, signInWithGoogle, resetPassword } from "@/lib/auth";
import { toast } from "sonner";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const errorParam = searchParams.get("error");
  const resetDone = searchParams.get("reset") === "true";

  function getPostLoginRedirect(): string {
    if (typeof window !== "undefined") {
      const pendingInvite = localStorage.getItem("bayit-pending-invite");
      if (pendingInvite) {
        return `/invite/${pendingInvite}`;
      }
    }
    return "/dashboard";
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    router.push(getPostLoginRedirect());
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const pendingInvite =
      typeof window !== "undefined"
        ? localStorage.getItem("bayit-pending-invite")
        : null;
    const result = await signInWithGoogle(
      pendingInvite ? `/invite/${pendingInvite}` : undefined
    );
    if (result.error) {
      toast.error(result.error);
      setGoogleLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail) return;

    setLoading(true);
    const result = await resetPassword(resetEmail);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("קישור לאיפוס סיסמה נשלח למייל!");
    setShowReset(false);
    setResetEmail("");
  }

  async function handleDemoMode() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-hero animate-gradient opacity-90" />

      {/* Decorative floating shapes */}
      <div className="absolute top-20 right-10 w-20 h-20 rounded-full bg-white/10 animate-float" />
      <div className="absolute bottom-32 left-8 w-14 h-14 rounded-2xl bg-white/10 animate-float" style={{ animationDelay: "1s" }} />
      <div className="absolute top-40 left-16 w-8 h-8 rounded-full bg-white/15 animate-float" style={{ animationDelay: "2s" }} />

      <div className="w-full max-w-sm flex flex-col items-center gap-5 relative z-10">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg shadow-black/10 border border-white/30">
            <Home className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">בית בסדר</h1>
          <p className="text-white/80 text-center text-sm">
            ניהול תחזוקת הבית המשותף
            <br />
            <span className="flex items-center justify-center gap-1 mt-1">
              <Sparkles className="w-3.5 h-3.5" />
              בקלות, בכיף ויחד
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </p>
        </div>

        {/* Glass Card */}
        <div className="w-full rounded-2xl bg-white/90 dark:bg-[#1a1730]/95 backdrop-blur-xl p-6 shadow-xl shadow-black/10 dark:shadow-black/40 border border-white/50 dark:border-[#2d2a45] space-y-4">
          {/* Error / Success Messages */}
          {errorParam === "auth" && (
            <div className="w-full bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 text-center">
              שגיאה בהתחברות. נסו שוב.
            </div>
          )}
          {resetDone && (
            <div className="w-full bg-success/10 border border-success/20 text-success text-sm rounded-xl px-4 py-3 text-center">
              הסיסמה עודכנה בהצלחה! התחברו עם הסיסמה החדשה.
            </div>
          )}

          {/* Password Reset Modal */}
          {showReset ? (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground text-center">
                איפוס סיסמה
              </h2>
              <p className="text-sm text-muted text-center">
                נשלח לכם קישור לאיפוס סיסמה למייל
              </p>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  placeholder="אימייל"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-background/60 dark:bg-background/80 border border-border rounded-xl pr-10 pl-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !resetEmail}
                className="w-full py-3 gradient-primary text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-primary/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "שליחת קישור"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="w-full text-sm text-muted hover:text-foreground transition-colors"
              >
                חזרה להתחברות
              </button>
            </form>
          ) : (
            <>
              {/* Email/Password Form */}
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    placeholder="אימייל"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background/60 dark:bg-background/80 border border-border rounded-xl pr-10 pl-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="סיסמה"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background/60 dark:bg-background/80 border border-border rounded-xl pr-10 pl-10 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    dir="ltr"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full py-3 gradient-primary text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-primary/20"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "התחברות"
                  )}
                </button>
              </form>

              {/* Forgot Password */}
              <button
                onClick={() => setShowReset(true)}
                className="w-full text-sm text-primary hover:underline"
              >
                שכחתם סיסמה?
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted">או</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google OAuth */}
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-surface border border-border rounded-xl font-medium text-foreground hover:bg-surface-hover transition-all disabled:opacity-50 text-sm shadow-sm"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {googleLoading ? "מתחבר..." : "התחברות עם Google"}
              </button>

              {/* Demo Mode */}
              <button
                onClick={handleDemoMode}
                className="w-full py-2.5 bg-background/60 dark:bg-surface/60 border border-border rounded-xl text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-all"
              >
                כניסה במצב דמו (ללא הרשמה)
              </button>

              {/* Register Link */}
              <p className="text-sm text-muted text-center">
                אין לכם חשבון?{" "}
                <Link
                  href="/register"
                  className="text-primary font-medium hover:underline"
                >
                  הרשמה
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-xs text-white/60 text-center">
          בהתחברות אתם מסכימים לתנאי השימוש ולמדיניות הפרטיות
        </p>
      </div>
    </div>
  );
}
