/**
 * Sumit webhook — payment confirmation handler.
 *
 * Sumit posts to this endpoint when:
 * - Payment succeeded (new subscription / renewal)
 * - Payment failed
 * - Document (invoice/receipt) issued
 *
 * Idempotency: drop duplicate events by sumit_payment_id in billing_events.
 *
 * NOT YET CONFIGURED. Set webhook URL in Sumit UI to:
 *   https://<your-domain>/api/sumit/webhook
 * And set SUMIT_WEBHOOK_SECRET in env.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // timing-safe compare
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUMIT_WEBHOOK_SECRET || '';
  const signature = req.headers.get('x-sumit-signature') || req.headers.get('x-signature');
  const rawBody = await req.text();

  // CRITICAL: reject ALL requests in production when secret is unset — otherwise
  // anyone on the internet can grant themselves a Family tier subscription by
  // POSTing a fake `payment.succeeded` event with an arbitrary ExternalIdentifier.
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[sumit/webhook] SUMIT_WEBHOOK_SECRET unset — refusing webhook in production');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }
    // dev/test only: log a loud warning so devs don't ship without the secret
    console.warn('[sumit/webhook] SUMIT_WEBHOOK_SECRET unset — accepting unsigned event (dev only)');
  } else if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const eventType = event.EventType || event.Type || 'unknown';
  const paymentId = event.PaymentID || event.payment_id;
  const documentId = event.DocumentID || event.document_id;

  // Idempotency check
  if (paymentId) {
    const { data: existing } = await supabase
      .from('billing_events')
      .select('id')
      .eq('sumit_payment_id', paymentId)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, dedup: true });
  }

  // Log event
  await supabase.from('billing_events').insert({
    sumit_payment_id: paymentId,
    sumit_document_id: documentId,
    event_type: eventType,
    raw_payload: event,
  });

  // Tier upgrade on payment_succeeded
  if (eventType === 'payment.succeeded' || eventType === 'recurring.charged') {
    const householdId = event.ExternalIdentifier || event.external_identifier;
    // SKU is the source of truth — accept only known SKUs from /api/sumit/checkout PRICING
    const sku: string = event.SKU || '';
    const tier: 'free' | 'plus' | 'family' =
      event.Tier === 'family' || sku === 'family-monthly' || sku === 'family-yearly'
        ? 'family'
        : event.Tier === 'plus' || sku === 'plus-monthly' || sku === 'plus-yearly'
          ? 'plus'
          : 'free';
    if (tier === 'free') {
      console.warn('[sumit/webhook] unknown SKU/Tier — skipping upgrade', { sku, eventTier: event.Tier });
    }
    if (householdId && tier !== 'free') {
      await supabase
        .from('subscriptions')
        .upsert({
          household_id: householdId,
          tier,
          status: 'active',
          sumit_subscription_id: event.SubscriptionID || null,
          sumit_last_document_id: documentId || null,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'household_id,status' });
    }
  }

  return NextResponse.json({ ok: true });
}
