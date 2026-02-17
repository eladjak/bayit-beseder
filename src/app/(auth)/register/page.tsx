"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { signUp, signInWithGoogle } from "@/lib/auth";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) return;

    if (password !== confirmPassword) {
      toast.error("הסיסמאות לא תואמות.");
      return;
    }

    if (password.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים.");
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, name);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Check if email confirmation is needed
    if (result.data && !result.data.email_confirmed_at) {
      toast.success("נרשמתם בהצלחה! בדקו את המייל לאימות החשבון.");
      router.push("/login");
    } else {
      toast.success("נרשמתם בהצלחה!");
      router.push("/dashboard");
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      toast.error(result.error);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
            <Home className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">הרשמה</h1>
          <p className="text-muted text-center">
            צרו חשבון והתחילו לנהל
            <br />
            את הבית ביחד
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="w-full space-y-3">
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="שם מלא"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:border-primary"
              autoComplete="name"
            />
          </div>

          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:border-primary"
              dir="ltr"
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="סיסמה (לפחות 6 תווים)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pr-10 pl-10 py-3 text-sm focus:outline-none focus:border-primary"
              dir="ltr"
              autoComplete="new-password"
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

          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="אימות סיסמה"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:border-primary"
              dir="ltr"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name || !email || !password || !confirmPassword}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              "יצירת חשבון"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted">או</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-surface border border-border rounded-xl font-medium text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50 text-sm"
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
          {googleLoading ? "מתחבר..." : "הרשמה עם Google"}
        </button>

        {/* Login Link */}
        <p className="text-sm text-muted">
          כבר יש לכם חשבון?{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            התחברות
          </Link>
        </p>

        <p className="text-xs text-muted text-center">
          בהרשמה אתם מסכימים לתנאי השימוש ולמדיניות הפרטיות
        </p>
      </div>
    </div>
  );
}
