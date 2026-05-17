/**
 * Sumit checkout — creates a hosted payment redirect URL for a tier upgrade.
 *
 * Flow:
 *   1. Client POSTs { householdId, tier, billing: 'monthly'|'yearly' }
 *   2. We call Sumit /billing/payments/beginredirect/
 *   3. Sumit returns a hosted URL
 *   4. User completes payment on Sumit
 *   5. Sumit fires webhook → /api/sumit/webhook → subscription row created
 *
 * Pricing per docs/pricing-model.md §6:
 *   Plus:   19 NIS monthly / 190 NIS yearly
 *   Family: 39 NIS monthly / 390 NIS yearly
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSumitClient } from '@/lib/sumit-client-inline';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// 10 checkout starts per minute per IP — leaves room for retries but blocks abuse
const limiter = rateLimit({ windowMs: 60_000, max: 10 });

const PRICING: Record<string, Record<string, { amount: number; sku: string; description: string }>> = {
  plus: {
    monthly: { amount: 19, sku: 'plus-monthly', description: 'בית בסדר Plus — חודשי' },
    yearly: { amount: 190, sku: 'plus-yearly', description: 'בית בסדר Plus — שנתי' },
  },
  family: {
    monthly: { amount: 39, sku: 'family-monthly', description: 'בית בסדר Family — חודשי' },
    yearly: { amount: 390, sku: 'family-yearly', description: 'בית בסדר Family — שנתי' },
  },
};

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

  // 3. Parse + validate body
  const { householdId, tier, billing = 'monthly' } = await req.json();
  if (!householdId || !PRICING[tier]?.[billing]) {
    return NextResponse.json({ error: 'Invalid tier/billing' }, { status: 400 });
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
  const plan = PRICING[tier][billing];

  try {
    // 6. Use server-side authenticated identity — never trust client-supplied email/name
    const result = await sumit.payments.beginRedirect({
      Customer: {
        Name: user.user_metadata?.full_name || 'משתמש בית בסדר',
        EmailAddress: user.email || null,
        ExternalIdentifier: householdId,
      },
      Items: [
        {
          Description: plan.description,
          Quantity: 1,
          UnitPrice: plan.amount,
          SKU: plan.sku,
        },
      ],
      RedirectURL: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bayit-beseder.vercel.app'}/settings?upgrade=success`,
      IssueInvoice: true,
      ExternalIdentifier: householdId,
    }) as { RedirectURL?: string; PaymentURL?: string; PaymentID?: string };

    return NextResponse.json({
      checkoutUrl: result?.RedirectURL || result?.PaymentURL,
      paymentId: result?.PaymentID,
    });
  } catch (e: any) {
    console.error('[sumit/checkout] error:', e.message);
    return NextResponse.json({ error: e.message || 'Checkout failed' }, { status: 500 });
  }
}
