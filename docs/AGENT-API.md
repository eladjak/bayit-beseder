# בית בסדר — Agent API (`/api/agent/*`)

The **second front door** to BayitBeSeder. Lets an external agent (Kami / Box /
Solis / any Claude / OpenClaw) command the app by voice or text — e.g. *"תכין לי
תוכנית לשבוע ושלח לי בוואטסאפ"* — without anyone opening the UI.

> Status: Phase 1.1 (read + plan-generate + **task write**). 2026-06-14: initial
> `/api/agent/{capabilities,plan,brief}`. 2026-06-19: added `/api/agent/task`
> (list / add / complete). Builds on the design in `docs/AGENT-INTERFACE.md`.

---

## Authentication

Every `/api/agent/*` request requires a bearer token:

```
Authorization: Bearer <BAYIT_AGENT_KEY>
```

- The key is read **only** from the environment (`BAYIT_AGENT_KEY`). There is no
  hardcoded default, and the API **fails closed** (HTTP 503) when the key is unset.
- `AGENT_API_TOKEN` is accepted as a documented alias; `BAYIT_AGENT_KEY` wins.
- Comparison is constant-time (`crypto.timingSafeEqual`).
- This token is **separate** from `CRON_SECRET` so it can be rotated/scoped
  independently of the Vercel cron jobs.

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

## WhatsApp delivery

> Status: **wired and live** (approved by Elad 2026-06-14). Opt-in per request.

When a request to `/api/agent/plan` (body `"deliver":"whatsapp"`) or
`/api/agent/brief` (query `?deliver=whatsapp`) sets the flag, the server sends
the generated `whatsappText` over WhatsApp.

**The safety line (non-negotiable):**

- The recipient is **always Elad's own number**, read **exclusively** from the
  env var `BAYIT_AGENT_WHATSAPP_TO`. It is **never** taken from the request body.
  An agent can ask us to *deliver*, but cannot *choose the recipient* — so the
  endpoint can never be used to spam an arbitrary number.
- If `BAYIT_AGENT_WHATSAPP_TO` is unset, delivery **fails closed**: nothing is
  sent, and `delivery.status` reports it. The JSON + `whatsappText` are still
  returned, so a caller can always fall back to forwarding the text itself.
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
- **WhatsApp delivery recipient is env-only** (`BAYIT_AGENT_WHATSAPP_TO`), never
  from the request — an agent cannot choose who gets messaged. Fails closed.
- Additive: no existing UI route or behavior is changed; `deliver` is opt-in.
