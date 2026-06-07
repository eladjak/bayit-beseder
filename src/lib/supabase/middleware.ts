import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Auth pages that don't need protection
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/callback") ||
    pathname.startsWith("/auth");

  // If user is logged in and visits auth pages, redirect to dashboard
  // Landing page ("/") stays accessible so logged-in users can share it
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Demo mode is disabled (launch). Auth on (app) routes is enforced
  // client-side by the AuthGuard component (allowDemo=false), which redirects
  // unauthenticated users to /login. Data is additionally protected by Supabase
  // RLS. Middleware does not gate (app) paths today; a server-side redirect here
  // would be a reasonable post-launch defense-in-depth addition.

  return supabaseResponse;
}
