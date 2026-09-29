# בית בסדר — Agent API (`/api/agent/*`)

The **second front door** to BayitBeSeder. Lets an external agent (Kami / Box /
Solis / any Claude / OpenClaw) command the app by voice or text — e.g. *"תכין לי
תוכנית לשבוע ושלח לי בוואטסאפ"* — without anyone opening the UI.

> Status: Phase 1.1 (read + plan-generate + **task write**). 2026-06-14: initial
> `/api/agent/{capabilities,plan,brief}`. 2026-06-19: added `/api/agent/task`
> (list / add / complete). Builds on the design in `docs/AGENT-INTERFACE.md`.

---

## Connect an agent (start here)

| What | Where |
|------|-------|
| **Get a token** | In the app: **Settings → חיבור לסוכנים**. A household member creates a token with a label (e.g. "קלוד"); the raw token is shown **once**. Tokens can be listed (masked) and revoked in the same place. Max 10 active tokens per household. |
| **MCP server** (Claude & other MCP clients) | `https://www.bayitbeseder.com/api/mcp` — Streamable HTTP, stateless, same bearer token. Tools: `list_tasks`, `add_task`, `complete_task`, `weekly_plan`, `daily_brief`, `tonight_prep`. |
| **OpenAPI 3.1** | `https://www.bayitbeseder.com/api/agent/openapi.json` (public, no token). |
| **Agent summary** | `https://www.bayitbeseder.com/llms.txt` |

Claude Code:

```bash
claude mcp add --transport http bayit https://www.bayitbeseder.com/api/mcp   --header "Authorization: Bearer <token>"
```

MCP tools never accept a `householdId` (the token decides) and never accept a
recipient. Every tool is a thin adapter over the HTTP routes
below (`src/lib/agent/mcp-server.ts`), so scoping and validation live in one place.

Two extra tools appear **only** for tokens created with the matching opt-in scope:
`send_to_me` (`deliver_to_me`) and `delete_task` (`delete_tasks`). See
[Token scopes](#token-scopes-and-two-step-confirmation).

Token management routes (cookie-session, household members only, used by the
settings page): `GET/POST /api/agent-tokens`, `DELETE /api/agent-tokens/<id>`.

---

## Authentication

> **2026-09-27: per-household tokens.** See
> `docs/DESIGN-per-household-agent-tokens.md` and
> `docs/AGENT-API-MULTI-TENANT-GAP.md` (now marked FIXED). The household a
> caller acts on is resolved **from the bearer token itself**
> (`src/lib/agent/auth.ts` → `verifyAgentRequest`) — a `householdId` field in
> the request body/query below is accepted for backward compatibility but is
> **ignored** for authorization. Issue a token with
> `node scripts/issue-agent-token.mjs issue <householdId> [label]`.

Every `/api/agent/*` request requires a bearer token:

```
Authorization: Bearer <household agent token>
```

- **Preferred:** a per-household token from the `household_agent_tokens`
  table (migration `020_household_agent_tokens.sql`), issued via
  `scripts/issue-agent-token.mjs`. Only its SHA-256 hash is stored; the raw
  value is shown once at issuance and cannot be recovered.
- **Legacy / transition:** the old shared `BAYIT_AGENT_KEY` (or its
  `AGENT_API_TOKEN` alias) still authenticates, but it now authorizes **zero
  households** unless the server operator pins it to exactly one via
  `BAYIT_AGENT_KEY_HOUSEHOLD_ID` — it can never again act on "whatever
  household the caller names". Move any caller still using it to a real
  per-household token, then unset it.
- The API **fails closed** (HTTP 503) when neither a per-household token
  store nor a legacy key is reachable at all; it returns 403 for an
  unrecognized/revoked token or a legacy key with no household authorized.
- Comparison of the legacy key is constant-time (`crypto.timingSafeEqual`);
  the per-household token is looked up by an exact hash match in Postgres.
- This credential is **separate** from `CRON_SECRET` so it can be
  rotated/scoped independently of the Vercel cron jobs.

Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set it in Vercel project settings / `.env.local` as `BAYIT_AGENT_KEY`.

### Error responses

| Status | Meaning |
|-------:|---------|
| 401 | Missing `Authorization: Bearer` header |
| 403 | Wrong token |
| 503 | `BAYIT_AGENT_KEY` not configured on the server (API disabled) |
| 409 | Conflict — task already completed or skipped (complete action) |
| 429 | Rate limit exceeded (10/min for `plan`, 20/min for `brief`, 30/min for `task`, per IP) |
| 400 | Invalid params (Zod validation) |

---

## Endpoints

### `GET /api/agent/capabilities`

Self-describing manifest. An agent reads this once to learn the available
actions, params, and auth scheme.

```bash
curl -s https://www.bayitbeseder.com/api/agent/capabilities \
  -H "Authorization: Bearer $BAYIT_AGENT_KEY"
```

Returns a JSON manifest: `{ name, description, version, auth, actions[], sendChannel }`.

---

### `POST /api/agent/plan`

Generate a balanced weekly household plan. Returns the plan as JSON **plus a
ready-to-send Hebrew WhatsApp text block** (`whatsappText`).

**Body (all optional):**

| Field | Type | Notes |
|-------|------|-------|
| `householdId` | `string (uuid)` | If supplied, existing (non-completed) tasks for that household are folded into the plan and member names are resolved. Requires `SUPABASE_SERVICE_ROLE_KEY` on the server. |
| `weekStart` | `string YYYY-MM-DD` | Defaults to the Sunday of the current week (Israeli week starts Sunday). |
| `zoneMode` | `boolean` | Zone-first scheduling (groups tasks by house zones). |
| `members` | `string[] (uuid)` | Member ids to balance across. Derived from `householdId` when omitted. |
| `deliver` | `"whatsapp"` | If set, the server sends `whatsappText` to **Elad's own WhatsApp only** (recipient from env `BAYIT_AGENT_WHATSAPP_TO`, never from this body). See [WhatsApp delivery](#whatsapp-delivery). |

```bash
curl -s -X POST https://www.bayitbeseder.com/api/agent/plan \
  -H "Authorization: Bearer $BAYIT_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"householdId":"00000000-0000-0000-0000-000000000000","zoneMode":true}'
```

**Response:**

```jsonc
{
  "plan": {
    "weekStart": "2026-06-14",
    "totalTasks": 23,
    "totalMinutes": 310,
    "perMember": { "אלעד": 12, "ענבל": 11 },
    "days": [
      {
        "date": "2026-06-14",
        "dayName": "יום ראשון",
        "totalMinutes": 45,
        "tasks": [
          {
            "title": "שטיפת כלים / הפעלת מדיח",
            "category": "kitchen",
            "categoryLabel": "מטבח",
            "assignee": "אלעד",
            "estimatedMinutes": 15,
            "difficulty": 2,
            "isExisting": false
          }
        ]
      }
    ]
  },
  "whatsappText": "📅 תוכנית שבועית — בית בסדר\n…",
  "delivery": { "attempted": false, "channel": null, "sent": false, "status": "לא התבקשה שליחה" },
  "meta": { "householdScoped": true, "weekStart": "2026-06-14", "generatedAt": "…" }
}
```

The plan generation is a **pure function** — it performs **no DB writes** and has
no side effects. It only reads existing tasks when `householdId` is provided.
The `delivery` field reports whether a WhatsApp send was requested/performed
(see below).

---

### `GET /api/agent/brief`

Today's brief: open tasks for today, who's assigned, overdue count, and the
daily streak — as JSON plus a ready-to-send WhatsApp text block.

```bash
curl -s "https://www.bayitbeseder.com/api/agent/brief?householdId=$HID&deliver=whatsapp" \
  -H "Authorization: Bearer $BAYIT_AGENT_KEY"
```

**Response:** `{ date, dayOfWeek, tasks[], taskCount, overdueCount, streak, whatsappText, delivery, meta }`.
`deliver=whatsapp` is an optional query param (same semantics as the body flag below).

---

### `POST /api/agent/task`

**Agent-facing task read/write.** Lets Kami / Box say:
- *"תוסיף משימה: להפשיר עוף לארבע"* → `action:"add"`
- *"מה המשימות הפתוחות?"* → `action:"list"`
- *"סמן משימה X כהושלמה"* → `action:"complete"`

Rate-limited at **30/min per IP**.

**action: `"list"` — get open tasks**

```bash
curl -s -X POST https://www.bayitbeseder.com/api/agent/task \
  -H "Authorization: Bearer $BAYIT_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"list","householdId":"'"$HID"'"}'
# → { action:"list", tasks:[{id, title, status, dueDate, assignedTo, points}], count }
```

**action: `"add"` — create a task**

```bash
curl -s -X POST https://www.bayitbeseder.com/api/agent/task \
  -H "Authorization: Bearer $BAYIT_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"add","householdId":"'"$HID"'","title":"להפשיר עוף לארבע","assignee":"אלעד","due":"2026-06-20"}'
# → 201 { action:"add", task:{...}, message:"✅ משימה נוספה: ..." }
```

**action: `"complete"` — mark a task done**

```bash
curl -s -X POST https://www.bayitbeseder.com/api/agent/task \
  -H "Authorization: Bearer $BAYIT_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"complete","householdId":"'"$HID"'","taskId":"<task-uuid>"}'
# → { action:"complete", taskId, title, pointsAwarded, message:"✅ משימה הושלמה: ..." }
```

Security: `householdId` is required for writes and scopes every Supabase query — an agent cannot touch another household's data. Status guard: only `pending`/`in_progress` tasks can be completed (409 if already done/skipped).

---

## Token scopes and two-step confirmation

Every per-household token has **scopes**, chosen when the token is created in
Settings → חיבור לסוכנים. **Scopes cannot be widened afterwards**: to change them,
create a new token.

| Scope | Default | Lets the token |
| --- | --- | --- |
| `read`, `write` | always | list tasks, add tasks, complete tasks, get a plan / brief / prep (nothing is sent, nothing is deleted) |
| `deliver_to_me` | **off** | send the plan / brief / prep by WhatsApp **only to the phone of the member who created the token** |
| `delete_tasks` | **off** | delete tasks of the token's own household |

Existing tokens keep the default scopes. A request that needs a scope the token
lacks gets **403**.

**Two-step confirm** (both opt-in actions):

1. Call without `confirm_token`. Nothing happens. You get a preview
   (`preview` for delete; `whatsappText` + `delivery.requiresConfirmation` for
   deliver) and a single-use `confirm_token` (`delivery.confirmToken` for deliver).
2. **Show the preview to your human and ask.** Only if they say yes, repeat the
   same call with `confirm_token`. Never confirm on your own.

A confirm token is valid for **5 minutes**, works **once**, and is bound to the
token, the action and the target (the task id, or the message kind + the
recipient). Reusing it, letting it expire, or presenting it for a different
target is rejected (**409**).

```bash
# 1. preview
curl -s -X POST https://www.bayitbeseder.com/api/agent/task \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"delete","taskId":"<task-uuid>"}'
# → { requiresConfirmation:true, deleted:false, preview:{...}, confirm_token:"bbs_confirm_…" }
# 2. only after the human said yes
curl -s -X POST https://www.bayitbeseder.com/api/agent/task \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"delete","taskId":"<task-uuid>","confirm_token":"bbs_confirm_…"}'
# → { deleted:true, taskId, title }
```

Every preview, execution, refusal and failed attempt of these two actions is
written to an audit log; the most recent ones are shown in the settings section.

Rollout note: scopes, creator tracking, confirmations and the audit log live in
migration `supabase/migrations/024_agent_token_scopes.sql`. Until it is applied
every token behaves as default-scopes and both opt-in actions are unavailable.

## WhatsApp delivery

> Requires the opt-in `deliver_to_me` scope and a two-step confirm (above).

When a request to `/api/agent/plan` (body `"deliver":"whatsapp"`),
`/api/agent/brief` or `/api/agent/prep` (query `?deliver=whatsapp`) sets the
flag, the server sends the generated `whatsappText` over WhatsApp.

**The safety line (non-negotiable):**

- The recipient is **always the phone in the profile of the member who created
  the token** (and only while that member is still in the household). It is
  **never** taken from the request. There is no recipient parameter; a request
  that carries a field such as `to`, `phone`, `recipient`, `member` or `userId`
  is refused with 400. An agent can ask us to *deliver*, but cannot *choose the
  recipient*.
- No scope, no creator, no phone in the profile, or an unavailable confirmation
  store: delivery **fails closed** and nothing is sent. The JSON + `whatsappText`
  are still returned, so a caller can always forward the text itself.
- The legacy shared `BAYIT_AGENT_KEY` (owner's key, transition period) still
  delivers to `BAYIT_AGENT_WHATSAPP_TO` as before.
- Transport reuses the app's existing, already-live **Green API** client
  (`src/lib/whatsapp.ts`) — the same path the daily-brief cron uses. No new
  WhatsApp integration was introduced; no WAHA.

**`delivery` object in the response:**

```jsonc
{ "attempted": true, "channel": "whatsapp", "sent": true, "status": "נשלח ל-WhatsApp של אלעד", "idMessage": "…" }
```

`sent` is `true` only when the transport accepted the message. A failed send
never breaks the primary response (you still get the plan + text).

### Live flow (the use-case Elad named)

```bash
# One call: generate the weekly plan AND deliver it to Elad's WhatsApp.
curl -s -X POST https://www.bayitbeseder.com/api/agent/plan \
  -H "Authorization: Bearer $BAYIT_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"householdId":"'"$HID"'","deliver":"whatsapp"}'
# → { plan, whatsappText, delivery: { sent: true, ... }, meta }
```

So Kami can map *"תכין לי תוכנית לשבוע ושלח לי בוואטסאפ"* to a single authed
POST with `deliver:"whatsapp"`.

### Without delivery (forward it yourself)

Omit `deliver` to just get `whatsappText` and forward it through your own
channel — e.g. the app's pre-existing `POST /api/whatsapp/send`
(secured by `CRON_SECRET`), or an agent's own outbound webhook.

---

## Required env vars

| Var | Purpose |
|-----|---------|
| `BAYIT_AGENT_KEY` | Bearer token for all `/api/agent/*`. Fail-closed (503) if unset. |
| `BAYIT_AGENT_WHATSAPP_TO` | Elad's WhatsApp recipient — **bare number** (e.g. `972525427474`). `formatPhone()` in `src/lib/whatsapp.ts` appends `@c.us`; do NOT include it here or Green API gets a double-suffix → 400. |
| `GREEN_API_INSTANCE_ID`, `GREEN_API_TOKEN`, `GREEN_API_URL` | Existing Green API transport (already set; used by the daily-brief cron). |

---

## Security summary

- Bearer `BAYIT_AGENT_KEY`, env-only, fail-closed, constant-time compare.
- Per-IP rate limiting (shared Upstash limiter, in-memory fallback).
- Zod input validation on every body/query.
- `householdId` scoping; private household data is never returned without a
  valid token, and household reads use the service-role key server-side only.
- **WhatsApp delivery** needs the `deliver_to_me` scope, goes only to the token
  creator's own phone (never from the request), is two-step, and fails closed.
- **Task deletion** needs the `delete_tasks` scope, is two-step, household-scoped
  and logged.
- Additive: `deliver` and `delete` are opt-in per token.
