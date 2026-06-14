# בית בסדר — Agent API (`/api/agent/*`)

The **second front door** to BayitBeSeder. Lets an external agent (Kami / Box /
Solis / any Claude / OpenClaw) command the app by voice or text — e.g. *"תכין לי
תוכנית לשבוע ושלח לי בוואטסאפ"* — without anyone opening the UI.

> Status: Phase 1 (read + plan-generate). Implemented 2026-06-14 on branch
> `feat/agent-api-ui-qa-2026-06-14`. Builds on the design in
> `docs/AGENT-INTERFACE.md`.

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
| 429 | Rate limit exceeded (10/min for `plan`, 20/min for `brief`, per IP) |
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
  "meta": { "householdScoped": true, "weekStart": "2026-06-14", "generatedAt": "…" }
}
```

The plan generation is a **pure function** — it performs **no DB writes** and has
no side effects. It only reads existing tasks when `householdId` is provided.

---

### `GET /api/agent/brief`

Today's brief: open tasks for today, who's assigned, overdue count, and the
daily streak — as JSON plus a ready-to-send WhatsApp text block.

```bash
curl -s "https://www.bayitbeseder.com/api/agent/brief?householdId=$HID" \
  -H "Authorization: Bearer $BAYIT_AGENT_KEY"
```

**Response:** `{ date, dayOfWeek, tasks[], taskCount, overdueCount, streak, whatsappText, meta }`.

---

## Example flow: external agent → generate plan → send to WhatsApp

This is the concrete use-case Elad named. The agent never opens the UI; it
generates the plan and forwards the prepared text to a messaging channel.

```bash
# 1. Agent generates the weekly plan
RESP=$(curl -s -X POST https://www.bayitbeseder.com/api/agent/plan \
  -H "Authorization: Bearer $BAYIT_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"householdId":"'"$HID"'"}')

# 2. Agent extracts the ready-to-send block
TEXT=$(echo "$RESP" | jq -r '.whatsappText')

# 3. Agent forwards it to the user's WhatsApp
#    (BayitBeSeder already has POST /api/whatsapp/send, secured by CRON_SECRET.)
curl -s -X POST https://www.bayitbeseder.com/api/whatsapp/send \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0501234567","message":'"$(echo "$TEXT" | jq -Rs .)"'}'
```

### Or to a generic webhook (the agent's own channel)

The Agent API deliberately **does not send WhatsApp itself** — sending is a
separate, approved step. The shape an agent would POST to its own outbound
webhook:

```jsonc
POST https://my-agent.example.com/outbound
{
  "channel": "whatsapp",
  "to": "+972501234567",
  "text": "<plan.whatsappText verbatim>"
}
```

> ⚠️ **Not wired here:** no real WhatsApp send is triggered by the Agent API.
> `whatsappText` is produced for the calling agent to forward. Wiring an
> automatic send from `/api/agent/plan` requires Elad's explicit approval
> (it would message the household).

---

## Security summary

- Bearer `BAYIT_AGENT_KEY`, env-only, fail-closed, constant-time compare.
- Per-IP rate limiting (shared Upstash limiter, in-memory fallback).
- Zod input validation on every body/query.
- `householdId` scoping; private household data is never returned without a
  valid token, and household reads use the service-role key server-side only.
- Additive: no existing UI route or behavior is changed.
