/**
 * Sumit webhook — payment confirmation handler.
 *
 * Sumit posts to this endpoint when:
 * - Payment succeeded (new subscription / renewal)
 * - Payment failed / declined
 * - A recurring/standing-order was cancelled
 *
 * Idempotency: drop duplicate events by sumit_payment_id in billing_events.
 *
 * NOT YET CONFIGURED. Set webhook URL in Sumit UI to:
 *   https://<your-domain>/api/sumit/webhook?key=<SUMIT_WEBHOOK_SECRET>
 * (the header x-sumit-signature / x-signature also works, if Sumit's UI can
 * send custom headers). Set SUMIT_WEBHOOK_SECRET in env. Never log the URL's
 * query string.
 *
 * ── What is verified vs assumed about Sumit's webhook shape ────────────────
 * Sumit's own documentation (help.sumit.co.il, "שליחת Webhook ממערכת סאמיט")
 * describes webhooks as a generic automation feature: you build a "view" over
 * some record type (a card — e.g. a charge, a document, a customer) inside
 * Sumit's UI, attach a trigger (create/update/delete/archive on that view),
 * and Sumit POSTs whatever fields that view exposes to a URL you configure —
 * (2026-09-29: the help articles on webhooks and triggers do NOT mention
 * custom headers at all — that part is unverified, hence the ?key= option
 * below). There is no
 * documented HMAC-signature scheme; Sumit does not publish a fixed
 * `payment.succeeded`/`recurring.charged` event-type vocabulary either — the
 * field names in the POST body are whatever the person who built the view
 * chose to include.
 *
 * Given that, this handler ASSUMES (not verified against a real Sumit
 * account, because none of the search paths tried — mintlify-index docs
 * search and two targeted web searches — turned up a public webhook-signing
 * spec or a fixed event-type list):
 *   - `SUMIT_WEBHOOK_SECRET` is set as a custom header value in the Sumit
 *     automation trigger UI, sent back on every call as `x-sumit-signature`
 *     or `x-signature`. verifySignature() accepts EITHER a plain match of
 *     that header against the secret (the realistic case, since Sumit's own
 *     UI only lets you add a static header value — it does not compute an
 *     HMAC over the body) OR an HMAC-SHA256 hex digest of the raw body
 *     keyed by the secret (kept for forward-compat, in case a future setup
 *     — e.g. a purpose-built relay in front of Sumit — does sign the body).
 *   - Event/field names (`EventType`, `PaymentID`, `SKU`, `ExternalIdentifier`,
 *     etc.) match what a previous session already wired the view to send.
 *     THIS IS UNVERIFIED. Before going live: build the actual Sumit
 *     automation trigger, look at one real payload it sends, and adjust the
 *     field names below to match if they differ.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;

  // Case 1 (realistic, per Sumit's UI-configured-header model): the header
  // IS the shared secret, sent back verbatim on every call.
  if (timingSafeStringEqual(signature, secret)) return true;

  // Case 2 (forward-compat, unverified): an HMAC-SHA256 hex digest of the
  // raw body, in case some setup does sign the body.
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeStringEqual(signature, expected);
}

// SKU is the source of truth — accept only the one real SKU from
// /api/sumit/checkout. Anything else (including the retired 'family-*' SKUs)
// is treated as unknown and never upgrades a household.
const KNOWN_SKU_TIER: Record<string, 'plus'> = {
  'plus-monthly': 'plus',
};

// Best-effort event-type buckets — see the header comment above for what is
// verified vs assumed here.
const SUCCESS_EVENTS = new Set(['payment.succeeded', 'recurring.charged']);
const FAILURE_EVENTS = new Set(['payment.failed', 'payment.declined', 'recurring.failed', 'recurring.declined']);
const CANCEL_EVENTS = new Set(['recurring.cancelled', 'recurring.canceled', 'subscription.cancelled', 'subscription.canceled']);

// The shape of an incoming Sumit webhook payload — UNVERIFIED, see the file
// header comment. Every field is optional because Sumit's automation-trigger
// webhooks only send whatever fields the view was built to expose.
interface SumitWebhookEvent {
  EventType?: string;
  Type?: string;
  PaymentID?: string;
  payment_id?: string;
  DocumentID?: string;
  document_id?: string;
  ExternalIdentifier?: string;
  external_identifier?: string;
  SKU?: string;
  Tier?: string;
  SubscriptionID?: string;
  UserID?: string;
}

/**
 * Secret passed in the URL (?key=<secret> or ?token=<secret>), for setups
 * where Sumit's UI cannot send custom headers. Plain timing-safe match only.
 * The query string is never logged (it carries the secret).
 */
function verifyQueryKey(req: NextRequest, secret: string): boolean {
  if (!secret) return false;
  const params = req.nextUrl.searchParams;
  const candidates = [params.get('key'), params.get('token')];
  let ok = false;
  for (const c of candidates) {
    if (c && timingSafeStringEqual(c, secret)) ok = true;
  }
  return ok;
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUMIT_WEBHOOK_SECRET || '';
  const signature = req.headers.get('x-sumit-signature') || req.headers.get('x-signature');
  const rawBody = await req.text();

  // CRITICAL: reject ALL requests in production when secret is unset — otherwise
  // anyone on the internet can grant themselves a Plus subscription by
  // POSTing a fake `payment.succeeded` event with an arbitrary ExternalIdentifier.
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[sumit/webhook] SUMIT_WEBHOOK_SECRET unset — refusing webhook in production');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }
    // dev/test only: log a loud warning so devs don't ship without the secret
    console.warn('[sumit/webhook] SUMIT_WEBHOOK_SECRET unset — accepting unsigned event (dev only)');
  } else if (!verifySignature(rawBody, signature, secret) && !verifyQueryKey(req, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: SumitWebhookEvent;
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
    const { data: existing, error: dedupeErr } = await supabase
      .from('billing_events')
      .select('id')
      .eq('sumit_payment_id', paymentId)
      .maybeSingle();
    if (dedupeErr) {
      console.error('[sumit/webhook] dedupe check failed:', dedupeErr.message);
      return NextResponse.json({ error: 'Dedupe check failed' }, { status: 500 });
    }
    if (existing) return NextResponse.json({ ok: true, dedup: true });
  }

  // Log event — if this write fails we must NOT return 200, otherwise Sumit
  // never retries and we silently lose the audit trail + the idempotency key
  // for this event.
  const { error: logErr } = await supabase.from('billing_events').insert({
    sumit_payment_id: paymentId,
    sumit_document_id: documentId,
    event_type: eventType,
    raw_payload: event,
  });
  if (logErr) {
    console.error('[sumit/webhook] billing_events insert failed:', logErr.message);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }

  const householdId: string | undefined = event.ExternalIdentifier || event.external_identifier;

  if (!householdId) {
    // Nothing to apply this event to. Not an error on our side — ack it so
    // Sumit doesn't retry forever — but it's worth knowing about.
    console.warn('[sumit/webhook] event carried no ExternalIdentifier (household id) — nothing to update', { eventType });
    return NextResponse.json({ ok: true });
  }

  if (SUCCESS_EVENTS.has(eventType)) {
    const sku: string = event.SKU || '';
    const tier = KNOWN_SKU_TIER[sku] || (event.Tier === 'plus' ? 'plus' : undefined);

    if (!tier) {
      console.warn('[sumit/webhook] unknown SKU/Tier — skipping upgrade', { sku, eventTier: event.Tier });
      return NextResponse.json({ ok: true });
    }

    const { data: activeRow, error: findErr } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .maybeSingle();
    if (findErr) {
      console.error('[sumit/webhook] failed to look up active subscription:', findErr.message);
      return NextResponse.json({ error: 'Failed to look up subscription' }, { status: 500 });
    }

    const row = {
      household_id: householdId,
      tier,
      status: 'active' as const,
      sumit_subscription_id: event.SubscriptionID || null,
      sumit_last_document_id: documentId || null,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      canceled_at: null,
    };

    const { error: writeErr } = activeRow
      ? await supabase.from('subscriptions').update(row).eq('id', activeRow.id)
      : await supabase.from('subscriptions').insert({ ...row, user_id: event.UserID || null });

    if (writeErr) {
      console.error('[sumit/webhook] failed to write subscription:', writeErr.message);
      return NextResponse.json({ error: 'Failed to write subscription' }, { status: 500 });
    }
  } else if (FAILURE_EVENTS.has(eventType) || CANCEL_EVENTS.has(eventType)) {
    const nextStatus = CANCEL_EVENTS.has(eventType) ? 'canceled' : 'past_due';

    const { data: activeRow, error: findErr } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .maybeSingle();
    if (findErr) {
      console.error('[sumit/webhook] failed to look up active subscription:', findErr.message);
      return NextResponse.json({ error: 'Failed to look up subscription' }, { status: 500 });
    }

    if (!activeRow) {
      // Nothing active to downgrade — not an error, just a no-op.
      return NextResponse.json({ ok: true });
    }

    const { error: writeErr } = await supabase
      .from('subscriptions')
      .update({
        status: nextStatus,
        ...(nextStatus === 'canceled' ? { canceled_at: new Date().toISOString() } : {}),
      })
      .eq('id', activeRow.id);

    if (writeErr) {
      console.error('[sumit/webhook] failed to update subscription status:', writeErr.message);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
