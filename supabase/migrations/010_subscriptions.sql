-- Wave-9 (Sprint Bayit-Stripe scaffolding) — 2026-05-10
-- Subscriptions schema. Activates the freemium tier system that's already wired in
-- src/hooks/useSubscription.ts (currently hardcoded to "free").
--
-- After running this migration:
--   1. Update useSubscription.ts to fetch from this table instead of hardcoding "free"
--   2. Add Stripe webhook handler to populate subscriptions
--   3. Stripe checkout page wires to a webhook that inserts/updates here

create extension if not exists "uuid-ossp";

-- ─── subscriptions table ───────────────────────────────────────────────────
create table if not exists public.subscriptions (
    id uuid primary key default uuid_generate_v4(),
    household_id uuid not null references public.households(id) on delete cascade,
    user_id uuid not null,                     -- Supabase auth user that owns the sub
    tier text not null check (tier in ('free', 'plus', 'family')),
    status text not null check (status in ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),

    -- Stripe references
    stripe_customer_id text,
    stripe_subscription_id text unique,
    stripe_price_id text,

    -- Lifecycle timestamps (UTC)
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at timestamptz,
    canceled_at timestamptz,
    trial_end timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Each household has at most ONE active sub at a time
    constraint unique_active_household_sub
        unique (household_id, status) deferrable initially deferred
);

create index if not exists idx_subscriptions_household on public.subscriptions(household_id);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

-- ─── RLS — read own household's sub ─────────────────────────────────────────
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
    on public.subscriptions for select
    using (
        exists (
            select 1 from public.household_members hm
            where hm.household_id = subscriptions.household_id
              and hm.user_id = auth.uid()
        )
    );

-- INSERT/UPDATE only via service role (Stripe webhook). No direct user mutations.
drop policy if exists "subscriptions_no_user_writes" on public.subscriptions;
create policy "subscriptions_no_user_writes"
    on public.subscriptions for insert
    with check (false);
create policy "subscriptions_no_user_updates"
    on public.subscriptions for update
    using (false);

-- ─── billing_events log — webhook idempotency + audit ───────────────────────
create table if not exists public.billing_events (
    id uuid primary key default uuid_generate_v4(),
    stripe_event_id text not null unique,
    event_type text not null,
    raw_payload jsonb not null,
    processed_at timestamptz not null default now(),
    error text
);

create index if not exists idx_billing_events_type on public.billing_events(event_type);
create index if not exists idx_billing_events_processed on public.billing_events(processed_at desc);

alter table public.billing_events enable row level security;
-- Only service role reads
drop policy if exists "billing_events_service_only" on public.billing_events;
create policy "billing_events_service_only"
    on public.billing_events for select
    using (false);

-- ─── trigger: updated_at ────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
    returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch
    before update on public.subscriptions
    for each row execute function public.touch_updated_at();

-- ─── seed: every existing household gets a 'free' subscription ──────────────
-- (so useSubscription.ts can always SELECT and find a row)
insert into public.subscriptions (household_id, user_id, tier, status)
select h.id, h.created_by, 'free', 'active'
from public.households h
where not exists (
    select 1 from public.subscriptions s
    where s.household_id = h.id and s.status = 'active'
);
