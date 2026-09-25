-- 016_whatsapp_webhook_dedupe.sql — 2026-09-25
--
-- STATUS: NOT APPLIED. This was written and reviewed in a prep-stage
-- worktree; nobody has run it against production yet. Run it in the
-- Supabase SQL editor (or via the linked Supabase CLI project) whenever
-- Elad is ready.
--
-- Idempotency table for POST /api/whatsapp/webhook. Green API redelivers a
-- webhook it did not get a 2xx for, and can in principle deliver the same
-- message twice for other reasons. Without this table, a redelivered
-- "1" (complete task #1) could mark the same task completed twice and send
-- the WhatsApp confirmation reply twice.
--
-- The route (src/app/api/whatsapp/webhook/route.ts) degrades gracefully if
-- this table does not exist yet: a query error on it is logged and treated
-- as "cannot verify duplicates right now, proceed anyway" rather than
-- failing the whole webhook. So applying this migration is safe to do at
-- any time — it only starts PROTECTING once it exists, it never blocks
-- anything by being absent.

create table if not exists public.whatsapp_webhook_events (
  id_message text primary key,
  chat_id text not null,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.whatsapp_webhook_events is
  'One row per Green API webhook delivery (keyed by idMessage) that '
  'successfully completed a task via reply-to-complete. Used to reject '
  'redelivered/duplicate webhooks for the same message. Not RLS-protected: '
  'only ever read/written by the service-role key from the webhook route.';

-- Cheap cleanup path for later, if this table ever needs pruning — not run
-- automatically by this migration:
--   delete from public.whatsapp_webhook_events where created_at < now() - interval '90 days';
