/**
 * Sumit checkout — creates a hosted payment redirect URL for the Plus upgrade.
 *
 * Flow:
 *   1. Client POSTs { householdId }
 *   2. We call Sumit /billing/payments/beginredirect/
 *   3. Sumit returns a hosted URL
 *   4. User completes payment on Sumit
 *   5. Sumit fires webhook → /api/sumit/webhook → subscription row created
 *
 * Business decision (Elad, 2026-09-28): ONE paid tier — Plus, 19 NIS/month
 * per household. No yearly pricing, no free trial, no Family tier/SKU.
 * The `family` SKU and yearly billing that used to live here were removed —
 * they were never wired into a real feature set and were never approved.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSumitClient } from '@/lib/sumit-client-inline';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// 10 checkout starts per minute per IP — leaves room for retries but blocks abuse
const limiter = rateLimit({ windowMs: 60_000, max: 10 });

const PLUS_PLAN = {
  amount: 19,
  sku: 'plus-monthly',
  description: 'בית בסדר Plus — חודשי',
} as const;

export async function POST(req: NextRequest) {
  // 1. Rate limit
  const rl = await limiter.check(getClientIp(req));
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.reset / 1000)) } },
    );
  }

  // 2. Authenticate — required to call paid endpoints
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Parse + validate body — only the household id is meaningful input now;
  // there is exactly one purchasable product (Plus, monthly), so tier/billing
  // are no longer accepted from the client.
  const { householdId } = await req.json();
  if (!householdId || typeof householdId !== 'string') {
    return NextResponse.json({ error: 'Invalid householdId' }, { status: 400 });
  }

  // 4. Authorize — caller must belong to the household they're upgrading
  const { data: membership, error: memErr } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .eq('household_id', householdId)
    .maybeSingle();
  if (memErr || !membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 5. Sumit credentials — accept both legacy SUMIT_API_TOKEN and current SUMIT_API_KEY
  const companyId = process.env.SUMIT_COMPANY_ID;
  const apiKey = process.env.SUMIT_API_KEY || process.env.SUMIT_API_TOKEN;
  if (!companyId || !apiKey) {
    return NextResponse.json({ error: 'Sumit not configured' }, { status: 500 });
  }

  const sumit = createSumitClient({ companyId, apiKey });
  const plan = PLUS_PLAN;

  try {
    // 6. Use server-side authenticated identity — never trust client-supplied email/name
    const result = await sumit.payments.beginRedirect({
      Customer: {
        Name: user.user_metadata?.full_name || 'משתמש בית בסדר',
        EmailAddress: user.email || null,
        ExternalIdentifier: householdId,
      },
      // Sumit REST V11 requires Items.Item nested object (NOT flat array)
      // Verified 2026-05-18: flat array caused 502 "שדה חסר: Items.Item"
      Items: {
        Item: [
          {
            Description: plan.description,
            Quantity: 1,
            UnitPrice: plan.amount,
            SKU: plan.sku,
          },
        ],
      },
      RedirectURL: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bayit-beseder.vercel.app'}/settings?upgrade=success`,
      // IssueInvoice:true asks Sumit to issue a document for this charge.
      // Elad is an עוסק פטור (VAT-exempt sole trader) — the document TYPE
      // (receipt, not "tax invoice"/"+VAT") is controlled by the default
      // document type configured on the Sumit account itself, not by this
      // API call. Confirm that account setting before going live.
      IssueInvoice: true,
      ExternalIdentifier: householdId,
    }) as { RedirectURL?: string; PaymentURL?: string; PaymentID?: string };

    return NextResponse.json({
      checkoutUrl: result?.RedirectURL || result?.PaymentURL,
      paymentId: result?.PaymentID,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Checkout failed';
    console.error('[sumit/checkout] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
