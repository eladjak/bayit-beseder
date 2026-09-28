/**
 * POST /api/sumit/cancel-subscription — household owner cancels their Plus subscription.
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
import { createSumitClient } from '@/lib/sumit-client-inline';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const limiter = rateLimit({ windowMs: 60_000, max: 10 });

export async function POST(req: NextRequest) {
  const rl = await limiter.check(getClientIp(req));
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.reset / 1000)) } },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { householdId } = await req.json();
  if (!householdId || typeof householdId !== 'string') {
    return NextResponse.json({ error: 'Invalid householdId' }, { status: 400 });
  }

  // Household-owner only — same pattern as the RLS-level owner check added in
  // migration 019_close_live_rls_holes.sql (public.is_household_owner).
  const { data: membership, error: memErr } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('household_id', householdId)
    .maybeSingle();
  if (memErr || !membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden — household owner only' }, { status: 403 });
  }

  // Service-role client: subscriptions writes are service-role only per RLS
  // (see 022_billing.sql) — the same reasoning as the webhook route.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const service = createServiceClient(url, serviceKey);

  const { data: activeRow, error: findErr } = await service
    .from('subscriptions')
    .select('id, sumit_payment_method_id')
    .eq('household_id', householdId)
    .eq('status', 'active')
    .maybeSingle();
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
