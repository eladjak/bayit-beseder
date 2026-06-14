# בית בסדר ↔ Agents — interface design + the real "why" (2026-05-27)

## The real origin (do not lose this)
Elad built בית בסדר to defuse a recurring, painful conflict at home with Inbal around
household tasks — **especially meal prep** (defrosting/cooking ahead). The pattern Elad named:
he does real work (laundry, cooking ahead) but it goes unseen; the criticism lands on what's
missing ("you didn't take meat out to defrost"); the meal-decision itself is exhausting
(decision fatigue + an unwritten "must vary every meal" rule + ingredients sometimes missing +
food he cooks often goes uneaten). The goal of agent-integration: **take the planning load off
Elad's head** so the task becomes small and systematic instead of a battlefield, and so Elad can
just *tell an agent* ("מה להפשיר הערב?", "תכין לי תפריט לשבוע") and get a concrete answer or a
proactive nudge — voice or text — without opening the UI.

This is the thesis Elad believes is the future of most apps: two front doors — a UI for people
who want to click, and an **agent/LLM instruction layer** for people (like him) who'd rather say
it out loud and have it happen. בית בסדר should expose BOTH.

## What already exists (reuse, don't reinvent)
- **Stack:** Next.js 16 + Supabase (dedicated project `bayit-beseder` / uqumzjmyejlhoyliyesu — NOT shared with kidushishi/sipurai). RLS on all tables.
- **Tables:** households, household_members, task_templates, task_instances, shopping_items,
  streaks, weekly_syncs, coaching_messages, profiles, categories, tasks, task_completions,
  love_tokens / surprise_box_opens / wheel_spins (Alopik), subscriptions.
- **Server auth pattern (REUSE THIS for agents):** cron routes verify
  `Authorization: Bearer ${CRON_SECRET}` and then query with `SUPABASE_SERVICE_ROLE_KEY`
  (bypasses RLS server-side). See `src/app/api/cron/daily-brief/route.ts`.
- **Messaging out:** `src/lib/whatsapp.ts` + `/api/whatsapp/send` (already sends to household phones);
  push via `src/lib/push.ts`; daily-brief cron builds a morning task brief at 08:00 IL.
- **AI in:** `/api/ai/chat` (gemini-3.5-flash, fixed 27.5) already answers questions about the app.

## Proposed agent interface (Phase 1 — bounded, build-ready)
Add an agent-facing namespace `src/app/api/agent/*`, **Bearer-secured with a NEW
`AGENT_API_TOKEN`** (separate from CRON_SECRET so it can be rotated/scoped), service-role queries:
- `GET  /api/agent/brief`   → today + tomorrow task_instances, who's assigned, shopping gaps,
  streak state. (Reuse daily-brief's query logic.) Lets any VPS agent answer "what's on today?".
- `POST /api/agent/task`    → `{action:"add"|"complete", title, assignee?, due?}`. Lets Elad say
  "Kami, תוסיף משימה: להפשיר עוף לארבע" and it lands in בית בסדר.
- `GET  /api/agent/prep`    → (Phase 2, needs meal model) "what to defrost/prep tonight for tomorrow".
The VPS agents (Kami :3001 / Box :3701 / Solis) call these over HTTPS with the token. Kami already
brokers Elad's WhatsApp, so "מה להפשיר הערב?" → Kami → GET /api/agent/prep → reply. Natural.

## Proposed meal-prep planner (Phase 2 — the actual pain-killer; needs Elad's input)
Goal: remove the decision. Data model (new migration):
- `meals` (id, household_id, name, who_eats text[]/jsonb — track that Elad eats kitzot but Inbal
  doesn't, prep_lead_hours, tags, last_served_at) — a rotating repertoire, NOT a blank "what should
  I cook today".
- `meal_plan` (date, meal_id, status) — the agreed week; removes the "must always be different"
  pressure by making the rotation a *decision already made together*, not a nightly negotiation.
- Logic: each evening a cron/agent computes "defrost X tonight (prep_lead_hours)"; flags shopping
  gaps from `shopping_items` so ingredients aren't missing; rotates from `meals` so no daily choosing.
- Per-person `who_eats` directly answers the "I'm the only one who ate it" waste problem.

### Intake Elad must provide to build Phase 2 (5 short answers)
1. 6–10 meals that are "in the rotation" (things you actually make).
2. For each: who eats it (you / Inbal / both / kids) + prep lead time (e.g. defrost = night before).
3. Acceptable repeat frequency (can a meal repeat weekly? every 3 days?).
4. Who shops, and where the inventory/missing-items list should live (bayit shopping_items is ready).
5. When you want the nightly "prep this for tomorrow" nudge (e.g. 21:00) and on which channel
   (WhatsApp via Kami / push / Solis).

## Hand-off to the network
- Kami (he) brokers Elad's WhatsApp → primary voice/text entry point for these calls.
- Box (he) — energy/health; can weight meal suggestions toward Elad's protocol when asked.
- Solis (she) — emotional layer; NOT a task executor, but should know this context so support is
  grounded (the home-tasks conflict is a live stressor for Elad).
- Gender registry is canonical: Kami+Box = he, Kaylee+Solis = she.

## Status
2026-05-27: design + intake defined. Phase 1 API = build-ready (reuses CRON_SECRET pattern).
Phase 2 meal planner blocked on Elad's 5-answer intake above. Related: bayit PROGRESS.md.
