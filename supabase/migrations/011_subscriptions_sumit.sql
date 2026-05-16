-- 011_subscriptions_sumit.sql — 2026-05-14
-- Migrate subscriptions from Stripe → Sumit (sumit.co.il).
-- 010_subscriptions.sql added Stripe columns; this adds Sumit columns alongside,
-- so we can drop Stripe ones AFTER the new flow is verified in production.

alter table public.subscriptions
    add column if not exists sumit_customer_id text,
    add column if not exists sumit_subscription_id text unique,
    add column if not exists sumit_payment_method_id text,
    add column if not exists sumit_last_document_id text;          -- last invoice/receipt

create index if not exists idx_subscriptions_sumit_customer
    on public.subscriptions(sumit_customer_id);
create index if not exists idx_subscriptions_sumit_sub
    on public.subscriptions(sumit_subscription_id);

-- billing_events: same idempotency table, but now keyed by Sumit payment id
alter table public.billing_events
    add column if not exists sumit_payment_id text unique,
    add column if not exists sumit_document_id text;

create index if not exists idx_billing_events_sumit_payment
    on public.billing_events(sumit_payment_id);

-- DO NOT DROP the stripe_* columns yet — keep them until Sumit flow is verified
-- against real charges. Plan: drop in migration 012 after first ₪19 successful charge.

comment on column public.subscriptions.sumit_customer_id is 'Sumit customer ID from /accounting/customers/create/';
comment on column public.subscriptions.sumit_subscription_id is 'Sumit recurring billing ID (hora''at keva)';
comment on column public.subscriptions.sumit_payment_method_id is 'Sumit payment method (card token) ID';
comment on column public.subscriptions.sumit_last_document_id is 'Last issued invoice/receipt — for showing the user their kabbalah';
