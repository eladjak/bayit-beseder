/**
 * Shared gate for the self-serve token-management routes
 * (`/api/agent-tokens`, `/api/agent-tokens/[id]`).
 *
 * Proves, on the SERVER, that the logged-in user (cookie session) is a member
 * of the household they want to manage tokens for, via the
 * `is_household_member` SQL function evaluated with the CALLER's own session
 * (so `auth.uid()` is the real user). Only after that does the caller get a
 * service-role client (the token table has no client RLS policies).
 */
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

const householdIdSchema = z.string().uuid();

export type GateResult =
  | {
      ok: true;
      householdId: string;
      service: ReturnType<typeof createServiceClient<Database>>;
      userId: string;
    }
  | { ok: false; response: NextResponse };

export async function requireHouseholdMember(householdIdRaw: unknown): Promise<GateResult> {
  const parsedId = householdIdSchema.safeParse(householdIdRaw);
  if (!parsedId.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: "מזהה משק בית לא תקין." }, { status: 400 }),
    };
  }
  const householdId = parsedId.data;

  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "יש להתחבר כדי לנהל חיבורי סוכנים." }, { status: 401 }),
    };
  }

  // `is_household_member` is not part of the generated Functions typing.
  const { data: isMember, error } = await (
    session as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
    }
  ).rpc("is_household_member", { target_household_id: householdId });

  if (error) {
    return {
      ok: false,
      response: NextResponse.json({ error: "לא ניתן לאמת חברות במשק הבית." }, { status: 503 }),
    };
  }
  // Fail closed: anything other than a literal `true` is a refusal.
  if (isMember !== true) {
    return {
      ok: false,
      response: NextResponse.json({ error: "אין לך הרשאה למשק הבית הזה." }, { status: 403 }),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      ok: false,
      response: NextResponse.json({ error: "השרת אינו מוגדר." }, { status: 500 }),
    };
  }
  return {
    ok: true,
    householdId,
    service: createServiceClient<Database>(url, key),
    userId: user.id,
  };
}
