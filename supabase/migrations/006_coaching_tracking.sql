-- ============================================================
-- Migration 006: Coaching Tracking
-- Adds coaching_events table for adaptive coaching system.
-- The existing coaching_messages table stores static templates;
-- this new table tracks every WhatsApp coaching message sent
-- so we can measure which styles lead to task completions.
-- ============================================================

-- Drop the table if it already exists from a previous attempt
-- (safe to run repeatedly)
create table if not exists public.coaching_events (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  message_type text not null check (message_type in ('morning_brief', 'evening_summary', 'nudge', 'celebration')),
  coaching_style text not null check (coaching_style in ('encouraging', 'factual', 'playful', 'urgent')),
  message_text text not null,
  sent_at      timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- Index for efficiency queries by household + time window
create index if not exists coaching_events_household_sent_at
  on public.coaching_events (household_id, sent_at desc);

-- RLS
alter table public.coaching_events enable row level security;

-- Household members can read their own coaching events (for the dashboard widget)
create policy "Members can view household coaching events"
  on public.coaching_events for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = coaching_events.household_id
        and hm.user_id = auth.uid()
    )
  );

-- Service role (cron jobs) can insert coaching events
-- (cron runs with service_role key, which bypasses RLS)
-- No additional insert policy needed for service role.
-- But if called from a signed-in user context, allow insert for members:
create policy "Members can insert coaching events"
  on public.coaching_events for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = coaching_events.household_id
        and hm.user_id = auth.uid()
    )
  );
