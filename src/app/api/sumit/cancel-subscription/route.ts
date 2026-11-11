/**
 * GET  /api/sumit/cancel-subscription — { cancellable: boolean } and nothing else: does one of MY households,
 *       where I am the owner, or a plan I pay for, have an active paid plan in our records? (used by the privacy gate screen,
 *       where the browser may not read this app's tables)
 * POST /api/sumit/cancel-subscription — household owner or payer records cancellation of their Plus subscription.
 *
 * Both work WITHOUT privacy consent (allow-listed): stopping a charge must always work. They use the
 * service client for every lookup, because the consent gate in the database (migration 028) closes the
 * household tables to the browser session for someone who has not consented. The caller is identified
 * only by the verified session; a body householdId is optional and, if given, must be one of the
 * caller's owned household or paid subscription.
 *
 * ── What this does and does NOT guarantee ───────────────────────────────────
 * Sumit's public documentation (help.sumit.co.il) and the two targeted web
 * searches run before writing this route did not turn up a documented REST
 * endpoint for stopping a recurring/standing-order ("הוראת קבע") charge —
 * only `/billing/recurring/charge/` (create a charge) and
 * `/billing/recurring/listforcustomer/` (list them) are wrapped in
 * sumit-client-inline.ts, and neither search path found a `.../cancel/` or
 * `.../stop/` sibling in Sumit's public docs.
 *
 * Because of that, this route does NOT claim to stop Sumit from attempting
 * the next charge. What it actually does:
 *   1. Marks the household's subscription `canceled` in OUR database —
 *      `useSubscription` stops granting Plus access once `current_period_end`
 *      passes (or immediately, if you choose to enforce that harder later).
 *   2. If a `sumit_payment_method_id` is on file for this household (it is
 *      NOT populated anywhere in the current checkout/webhook flow — Sumit's
 *      hosted `beginRedirect` checkout doesn't hand back a payment-method id
 *      to store — so in practice this branch will usually be a no-op today),
 *      it best-effort calls `paymentMethods.remove` on it.
 *
 * If Sumit is still configured to auto-charge the stored card on the next
 * period regardless, the ONLY way to actually stop it today is manually,
 * inside the Sumit dashboard. This is called out explicitly in the PR
 * description and in the "what Elad must do to go live" checklist — it is
 * not something this code can respond to via API.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSumitClient } from '@/lib/sumit-client-inline';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const limiter = rateLimit({ windowMs: 60_000, max: 10 });

function tooMany(rl: { reset: number }) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.reset / 1000)) } },
  );
}

/** Households where this person is the OWNER (service client: works without consent). */
async function ownedHouseholds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: SupabaseClient<any, any, any>,
  userId: string,
): Promise<{ ids: string[] } | { error: true }> {
  const { data, error } = await service
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('role', 'owner');
  if (error || !Array.isArray(data)) return { error: true };
  return { ids: (data as { household_id: string }[]).map((r) => r.household_id) };
}

function serviceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return null;
  return createServiceClient(url, serviceKey);
}

/**
 * A paid plan in an active or past-due state in our records. This does not establish provider billing
 * status and is broader than the deletion function’s billing-evidence predicate. Free rows never count.
 */
const PAID_ACTIVE = { column: 'tier', notValue: 'free' } as const;

export async function GET(req: NextRequest) {
  const rl = await limiter.check(getClientIp(req));
  if (!rl.success) return tooMany(rl);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

  const { data: paid, error: paidError } = await service.from('subscriptions').select('id')
    .eq('user_id', user.id).in('status', ['active', 'past_due']).neq('tier', 'free').limit(1);
  if (paidError) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  if (Array.isArray(paid) && paid.length > 0) return NextResponse.json({ cancellable: true });
  const owned = await ownedHouseholds(service, user.id);
  if ('error' in owned) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  if (owned.ids.length === 0) return NextResponse.json({ cancellable: false });

  const { data, error } = await service
    .from('subscriptions')
    .select('id')
    .in('household_id', owned.ids)
    .in('status', ['active', 'past_due'])
    .neq(PAID_ACTIVE.column, PAID_ACTIVE.notValue)
    .limit(1);
  if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  // A boolean and nothing else: never row data.
  return NextResponse.json({ cancellable: Array.isArray(data) && data.length > 0 });
}

export async function POST(req: NextRequest) {
  const rl = await limiter.check(getClientIp(req));
  if (!rl.success) return tooMany(rl);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { householdId?: unknown };
  const requested = typeof body.householdId === 'string' ? body.householdId : null;
  if (body.householdId !== undefined && !requested) {
    return NextResponse.json({ error: 'Invalid householdId' }, { status: 400 });
  }

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

  // Owners can cancel household plans; non-owners can cancel only plans billed to them.
  const owned = await ownedHouseholds(service, user.id);
  if ('error' in owned) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  const { data: payerRows, error: payerError } = await service.from('subscriptions').select('household_id')
    .eq('user_id', user.id).in('status', ['active', 'past_due']).neq('tier', 'free');
  if (payerError) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  const payerIds = ((payerRows ?? []) as { household_id: string }[]).map((r) => r.household_id);
  let householdId = requested;
  if (householdId) {
    if (!owned.ids.includes(householdId) && !payerIds.includes(householdId)) {
      return NextResponse.json({ error: 'Forbidden — household owner or payer only' }, { status: 403 });
    }
  } else {
    if (owned.ids.length === 0 && payerIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden — household owner or payer only' }, { status: 403 });
    }
    // No household named: the one (of the caller's own) that has an active paid plan.
    const { data: rows, error } = await service
      .from('subscriptions')
      .select('household_id')
      .in('household_id', [...new Set([...owned.ids, ...payerIds])])
      .in('status', ['active', 'past_due'])
      .neq(PAID_ACTIVE.column, PAID_ACTIVE.notValue);
    if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
    const candidates = [...new Set(((rows ?? []) as { household_id: string }[]).map((r) => r.household_id))];
    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No active subscription for this household' }, { status: 404 });
    }
    if (candidates.length > 1) {
      return NextResponse.json({ error: 'Several households have a plan; name one (householdId)' }, { status: 400 });
    }
    householdId = candidates[0];
  }

  let activeQuery = service
    .from('subscriptions')
    .select('id, sumit_payment_method_id')
    .eq('household_id', householdId)
    .in('status', ['active', 'past_due'])
    .neq(PAID_ACTIVE.column, PAID_ACTIVE.notValue);
  if (!owned.ids.includes(householdId)) activeQuery = activeQuery.eq('user_id', user.id);
  const { data: activeRow, error: findErr } = await activeQuery.maybeSingle();
  if (findErr) {
    console.error('[sumit/cancel-subscription] lookup failed:', findErr.message);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  if (!activeRow) {
    return NextResponse.json({ error: 'No active subscription for this household' }, { status: 404 });
  }

  const { error: updateErr } = await service
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('id', activeRow.id);
  if (updateErr) {
    console.error('[sumit/cancel-subscription] failed to mark canceled:', updateErr.message);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }

  // Best-effort: remove the stored payment method if we ever had one on
  // file. Failure here does not fail the cancellation — the DB row is
  // already the source of truth for entitlement.
  let paymentMethodRemoved = false;
  if (activeRow.sumit_payment_method_id) {
    const companyId = process.env.SUMIT_COMPANY_ID;
    const apiKey = process.env.SUMIT_API_KEY || process.env.SUMIT_API_TOKEN;
    if (companyId && apiKey) {
      try {
        const sumit = createSumitClient({ companyId, apiKey });
        await sumit.paymentMethods.remove(activeRow.sumit_payment_method_id);
        paymentMethodRemoved = true;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('[sumit/cancel-subscription] paymentMethods.remove failed (non-fatal):', message);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    status: 'canceled',
    paymentMethodRemoved,
    note: 'Cancellation is recorded in our database. Sumit does not expose a documented API to stop an existing recurring charge — verify manually in the Sumit dashboard that no further charge is scheduled.',
  });
}
