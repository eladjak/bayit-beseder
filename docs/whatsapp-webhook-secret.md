# Closing the WhatsApp webhook fail-open

**Status: IMPLEMENTED IN CODE, NOT DEPLOYED, NOT APPLIED.** The auth check
is now live in this branch's `src/app/api/whatsapp/webhook/route.ts`, but it
stays fail-open — accepting unauthenticated requests — until
`WHATSAPP_WEBHOOK_TOKEN` is set. Nothing here required Elad's action yet;
this doc tells him exactly what does.

## History — why this doc changed on 2026-09-25

The original version of this doc (2026-08-08) proposed closing the hole
with **HMAC-SHA256 body signing**: a header called `x-webhook-signature`
carrying a hex HMAC of the raw body, verified against
`WHATSAPP_WEBHOOK_SECRET`. That code shipped (in an earlier branch,
`fix/make-the-fail-open-visible`) but was never verified against what Green
API can actually send.

On 2026-09-25 that was checked directly against Green API's own
documentation (`green-api.com/en/docs/api/receiving/technology-webhook-endpoint/`
and `.../account/SetSettings/`), and confirmed a second way via search:

> Green API's **only** supported webhook-authentication mechanism is a
> **static token**. You set it once, in the instance settings, as the
> `webhookUrlToken` field (via the `SetSettings` API method or the
> console). From then on, every webhook Green API sends carries
> `Authorization: Bearer <that token>` (Basic is also selectable, Bearer is
> the default). Green API does **not** support HMAC body-signing. There is
> no way to make it send an `x-webhook-signature` header, or any
> caller-computed signature at all.

**This means the HMAC design in the old version of this doc could never
have been satisfied by real Green API traffic.** Deploying it as
fail-closed would not have added security — it would have been an outage
waiting to happen, because Green API was never going to send the header the
code was checking for. This is the reason `WHATSAPP_WEBHOOK_TOKEN` is a
**new**, separate env var name from the old `WHATSAPP_WEBHOOK_SECRET`,
rather than a value swapped into the same variable: they are two different
verification schemes, and reusing the name would have hidden that a
redeploy with the old secret set would still do nothing.

## What is true right now (verified 2026-09-25, in code)

`POST /api/whatsapp/webhook`:

- Accepts unauthenticated requests from anyone on the internet
  **when `WHATSAPP_WEBHOOK_TOKEN` is unset** — which, as far as this
  worktree could confirm from the code and `.env.example`, is still the
  case in production as of this writing. (This was **not** re-verified
  against the live `vercel env ls production` output during this task —
  that check requires Vercel access this worktree did not use, per the
  boundary rules it was given. Confirm before relying on this.)
- Once `WHATSAPP_WEBHOOK_TOKEN` **is** set, the route requires a matching
  `Authorization: Bearer <token>` header and returns `401` otherwise. No
  code change or redeploy is needed to flip this — setting the env var
  (and configuring the same value as `webhookUrlToken` in Green API) is the
  entire flip.
- The `GREEN_API_INSTANCE_ID` check still runs regardless, and is still not
  an authentication mechanism (it's a guessable non-secret ID) — it's a
  second, independent check, not a substitute for the token.
- The route now also **deduplicates** by Green API's `idMessage` so a
  redelivered webhook cannot complete the same task twice — see
  `supabase/migrations/016_whatsapp_webhook_dedupe.sql` (not yet applied;
  the route degrades gracefully until it is).

## What Elad needs to do, in this exact order

Order matters — step 3 is the one that is easy to skip and expensive to
skip. Enforcing a token the caller never sends turns a fixed security hole
into an outage.

1. **Generate a token** (any strong random string works; the route does
   the comparison, not the format):
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Set it in Green API first** — as `webhookUrlToken` in the instance's
   settings (Green API console, or `SetSettings` API call). Confirm the
   authorization type is Bearer (the default) unless there's a reason to
   pick Basic.
3. **Verify a real message still completes a task** with the token set in
   Green API but **before** setting `WHATSAPP_WEBHOOK_TOKEN` on the app —
   at this point the app is still fail-open, so this step only proves Green
   API is really sending the header, without any risk of breaking the live
   flow if it turns out not to be.
4. **Only then set `WHATSAPP_WEBHOOK_TOKEN`** in Vercel (same value as step
   2), for the Production environment. The very next incoming webhook will
   be checked.
5. **Apply `supabase/migrations/016_whatsapp_webhook_dedupe.sql`** whenever
   convenient — it is safe to apply before or after steps 1-4; the route
   already tolerates its absence.

## What was NOT done here, and why

- `WHATSAPP_WEBHOOK_TOKEN` was **not** set anywhere — keys and Vercel env
  vars are Elad's, per the standing rule that a prep task never touches
  production secrets.
- Green API's `webhookUrlToken` instance setting was **not** touched, for
  the same reason, and because `.env.example` and `src/lib/whatsapp.ts`
  **disagree** about whether this Green API instance is shared with Kami
  or dedicated to this app (see the note added to `.env.example` on
  2026-09-25). Touching instance-level webhook config on a possibly-shared
  instance without resolving that first could break Kami's WhatsApp bot.
- The migration was **not** applied to production.
- Whether `vercel env ls production` still shows `WHATSAPP_WEBHOOK_TOKEN`
  missing was **not** re-checked live during this task.
