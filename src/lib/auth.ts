"use client";

import { createClient } from "@/lib/supabase/client";
import type { AuthError, User } from "@supabase/supabase-js";

// ============================================
// Auth result types
// ============================================

interface AuthResult<T = void> {
  data: T | null;
  error: string | null;
}

// ============================================
// Auth functions
// ============================================

/**
 * Sign up with email and password.
 * Creates the auth user; the DB trigger auto-creates the profile row.
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult<User>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
      },
    });

    if (error) {
      return { data: null, error: mapAuthError(error) };
    }

    return { data: data.user, error: null };
  } catch {
    return { data: null, error: "שגיאה לא צפויה. נסו שוב." };
  }
}

/**
 * Sign in with email and password.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult<User>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { data: null, error: mapAuthError(error) };
    }

    return { data: data.user, error: null };
  } catch {
    return { data: null, error: "שגיאה לא צפויה. נסו שוב." };
  }
}

/**
 * Sign in with Google OAuth.
 * Redirects the browser to Google's login page.
 * @param next - Optional path to redirect to after login (default: /dashboard)
 */
export async function signInWithGoogle(next?: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const redirectTo = next
      ? `${window.location.origin}/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      return { data: null, error: mapAuthError(error) };
    }

    return { data: null, error: null };
  } catch {
    return { data: null, error: "שגיאה בהתחברות עם Google." };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { data: null, error: mapAuthError(error) };
    }

    return { data: null, error: null };
  } catch {
    return { data: null, error: "שגיאה בהתנתקות." };
  }
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?reset=true`,
    });

    if (error) {
      return { data: null, error: mapAuthError(error) };
    }

    return { data: null, error: null };
  } catch {
    return { data: null, error: "שגיאה בשליחת המייל. נסו שוב." };
  }
}

/**
 * Get the current authenticated user (or null).
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// ============================================
// Helpers
// ============================================

/** Map Supabase AuthError to a Hebrew user-friendly message */
function mapAuthError(error: AuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "אימייל או סיסמה שגויים.";
  }
  if (msg.includes("email not confirmed")) {
    return "יש לאמת את כתובת האימייל. בדקו את תיבת הדואר.";
  }
  if (msg.includes("user already registered")) {
    return "כתובת האימייל כבר רשומה. נסו להתחבר.";
  }
  if (msg.includes("password") && msg.includes("least")) {
    return "הסיסמה חייבת להכיל לפחות 6 תווים.";
  }
  if (msg.includes("rate limit")) {
    return "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.";
  }
  if (msg.includes("email")) {
    return "כתובת אימייל לא תקינה.";
  }

  return error.message;
}
