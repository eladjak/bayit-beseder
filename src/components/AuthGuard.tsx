"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  /** When true, allows unauthenticated access (mock/demo mode) */
  allowDemo?: boolean;
}

/**
 * Wraps app routes to enforce authentication.
 * - If user is authenticated -> renders children
 * - If allowDemo is true and no auth -> renders children (demo mode)
 * - Otherwise redirects to /login
 */
export function AuthGuard({ children, allowDemo = false }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user && !allowDemo) {
      const next = safeNext(`${pathname}${window.location.search}`);
      router.replace(
        process.env.NEXT_PUBLIC_NEW_UI === "true" && next !== "/dashboard"
          ? `/login?next=${encodeURIComponent(next)}`
          : "/login"
      );
      return;
    }

  }, [user, loading, allowDemo, router, pathname]);

  if (loading || (!user && !allowDemo)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted">טוען...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
