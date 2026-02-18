import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const displayName =
          user.user_metadata.full_name ??
          user.user_metadata.name ??
          user.email?.split("@")[0] ??
          "משתמש";

        // Check if profile exists (may have been auto-created by DB trigger)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, display_name")
          .eq("id", user.id)
          .single();

        if (!profile) {
          // Profile not created by trigger - insert manually
          // The profiles table requires 'name' (NOT NULL) from the shared schema
          await supabase.from("profiles").insert({
            id: user.id,
            name: displayName,
            email: user.email ?? "",
            display_name: displayName,
            avatar_url: user.user_metadata.avatar_url ?? null,
          });
        } else if (!profile.display_name) {
          // Profile exists (from trigger) but missing display_name - update it
          await supabase
            .from("profiles")
            .update({
              display_name: displayName,
              avatar_url: user.user_metadata.avatar_url ?? null,
            })
            .eq("id", user.id);
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
