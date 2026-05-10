# Stripe Integration — Bayit BeSeder

**Status (2026-05-10)**: Scaffolding deployed. Awaiting Stripe account + keys + ENV.

## What's deployed

### 1. SQL migration `010_subscriptions.sql`
- `subscriptions` table — household_id + tier + Stripe IDs + lifecycle timestamps
- `billing_events` table — webhook idempotency + audit log
- RLS: users can READ their household's sub; only service role can WRITE
- Auto-seed: every existing household gets a `tier='free'` row so `useSubscription.ts` always finds a row

### 2. `useSubscription.ts` (next phase)
Currently hardcoded:
```ts
const tier = "free" as SubscriptionTier;
```

Replace with:
```ts
const { data: sub } = useQuery({
  queryKey: ["subscription", householdId],
  queryFn: () => supabase.from("subscriptions")
    .select("*")
    .eq("household_id", householdId)
    .eq("status", "active")
    .single(),
});
const tier = (sub?.data?.tier ?? "free") as SubscriptionTier;
```

### 3. Stripe webhook handler (`src/app/api/stripe/webhook/route.ts`) — to build
Listens for:
- `customer.subscription.created` → INSERT into `subscriptions`
- `customer.subscription.updated` → UPDATE (status, period, etc.)
- `customer.subscription.deleted` → set `status='canceled'`
- `invoice.payment_succeeded` → keep `current_period_end` fresh
- `invoice.payment_failed` → set `status='past_due'`

Idempotency: check `billing_events.stripe_event_id`. Drop duplicates.

### 4. Checkout flow (`src/app/api/stripe/checkout/route.ts`) — to build
POST body: `{ priceId, householdId }`.
Creates Stripe Checkout Session with `client_reference_id=householdId`. Redirects to hosted Stripe page.

## ENV vars needed

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PLUS_MONTHLY=price_...
STRIPE_PRICE_FAMILY_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Pricing (per docs/pricing-model.md §6)

| Tier | Monthly | Yearly |
|---|---|---|
| Free | 0 NIS | 0 NIS |
| Plus | 19 NIS | 190 NIS |
| Family | 39 NIS | 390 NIS |

## Migration steps (for Elad)

1. Create Stripe account at stripe.com. Verify Israeli business details.
2. Create products in Stripe dashboard: "Plus", "Family". Add monthly + yearly prices for each.
3. Copy price IDs into Vercel ENV vars (above).
4. Apply SQL migration: `supabase db push` or via SQL Editor in Supabase dashboard.
5. Deploy webhook + checkout routes.
6. Test with Stripe test mode first (`sk_test_` + `whsec_` from Stripe dashboard test mode).
7. Switch to live keys once tested.

## Hebrew checkout UX

Stripe Checkout supports Hebrew via `locale: "he"` in Session creation. Verify RTL on the hosted page works correctly.

## Webhook security

`STRIPE_WEBHOOK_SECRET` validates payload via `stripe.webhooks.constructEvent()`. Reject if signature fails.

## Pricing flow integration

Existing `useSubscription` hook already gates 14 features by tier — no changes needed there once `tier` reads from DB instead of being hardcoded.
