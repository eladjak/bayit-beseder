# The `/api/agent/*` multi-tenant gap

**Status: DOCUMENTED, NOT FIXED.** Written 2026-09-25 as part of a prep-stage
security task. This is a real gap, demonstrated with tests, and it is being
left open on purpose rather than half-fixed — see "Why this is not fixed
here" below.

## The gap, in one sentence

`BAYIT_AGENT_KEY` proves **"this caller is an authorized agent"**. It does
not, and cannot, prove **"this caller is authorized to act on household
X"** — because `householdId` is a value the caller writes into the request
body, not something the token itself carries or restricts.

## What is NOT the gap

The `.eq("household_id", ...)` filters that exist in
`src/app/api/agent/task/route.ts` (in `handleList`, `handleComplete`, and
`handleAdd`) are real and they work correctly — a request that names
household A cannot, through those filters, accidentally read or write
household B's row. That part of the code is doing exactly what it looks
like it's doing.

## What IS the gap

Nothing stops a caller who holds the one global key from **naming any
household they like**. The token authenticates "an agent", not "an agent
scoped to household A". Two concrete, tested consequences:

### 1. Cross-household listing (no household needed at all)

`householdId` in the `list` action is **optional**. Calling
`{"action":"list"}` with no `householdId` returns tasks from **every**
household in the database to anyone holding the global key — no guessing
required. This is also how an attacker who only has the key, and nothing
else, would first learn a target household's UUID and its task UUIDs, which
feeds directly into the next point.

Test: `src/app/api/agent/task/__tests__/multi-tenant-gap.test.ts` →
`"list without a householdId returns tasks from EVERY household..."`.

### 2. Cross-household completion (household id + task id is enough)

Calling `{"action":"complete","householdId":"<any household>","taskId":"<a
task in it>"}` succeeds and really flips that task to `completed`, as long
as the caller holds the global key and knows those two UUIDs — which, per
point 1, the same API can hand them.

Test: `src/app/api/agent/task/__tests__/multi-tenant-gap.test.ts` →
`"a holder of the ONE global agent key can complete a task in a household
they were never granted..."`.

Both tests are backed by a red→green control: each was run once against a
patched `route.ts` that simulated a real per-household check (a hardcoded
household allowlist for `complete`; a forced single-household scope for
`list`) and, in that patched state, the corresponding test failed exactly as
predicted. That proves the tests are actually detecting the described
behavior, not passing vacuously. The patches were reverted immediately after
(verified via `git diff` showing no changes to `route.ts`) — nothing about
the patch survived in the delivered code.

## Why this is not fixed here

Closing this properly needs the caller to be tied to a household — i.e.
**per-household agent tokens**, or some other mapping from "who is calling"
to "which household they may act on". That is an authentication redesign,
not a filter you add to three queries:

- Where would a per-household token live? A new column on `households`? A
  separate `agent_tokens` table with rotation/revocation? Both need a
  migration, a way to issue/rotate tokens, and a decision about whether an
  agent (Kami, a future integration) can hold tokens for more than one
  household at once.
- `verifyAgentRequest` (`src/lib/agent/auth.ts`) would need to return
  *which* household(s) the presented token is valid for, and every handler
  in `route.ts` (plus `brief`, `capabilities`, `plan`, `prep` — the other
  four `/api/agent/*` routes, not audited in this task) would need to
  compare the caller's authorized household(s) against `body.householdId`
  instead of trusting it outright.
- None of that is reversible-by-revert the way a filter tweak is; it changes
  what every future integration has to send, and shipping it half-done
  (e.g. checking it in `complete` but not `list`, or checking it without a
  real issuance/rotation story) would be worse than the current honest gap,
  because it would look fixed without being fixed.

Per this task's own scoping rule — *"if fixing it properly requires
per-household agent tokens (a bigger design change), do NOT half-fix it —
instead write up the design gap clearly... and leave the global-key
behavior as-is with the gap documented"* — that is exactly what this
document and its two tests are doing.

## Practical exposure today

As of this task, the practical blast radius is limited by who actually
holds `BAYIT_AGENT_KEY` — it is Elad's own network of agents (Kami, this
Claude Code worktree, any future integration), not a public credential. The
gap matters the moment a second, less-trusted household is onboarded to
this app while any existing agent integration still holds the same global
key, or if the key is ever handed to a third party. **It should be closed
before that happens, not before it is convenient.**

## If/when this gets fixed

A minimal version, without a full token-per-household system, would be: a
`household_agent_tokens` table (`household_id`, `token_hash`,
`created_at`, `revoked_at`), `verifyAgentRequest` looks up the token and
returns the household(s) it is valid for, and every handler asserts
`body.householdId` is in that set before doing anything else — including
`list`, which today has no comparison to make at all.
