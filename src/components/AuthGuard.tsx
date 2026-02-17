"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
export function AuthGuard({ children, allowDemo = true }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user && !allowDemo) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [user, loading, allowDemo, router]);

  if (loading || !ready) {
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
