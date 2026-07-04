# Kami ↔ בית בסדר — wiring reference (2026-07-05)

**Source of truth for the running code: the VPS** (`/opt/elad-personal-agent`, Contabo — NOT a git repo).
This folder holds a snapshot + the operating manual so the integration is never lost.

## What runs where

| Piece | Location (VPS) | What it does |
|---|---|---|
| `bayit-client.ts` | `src/integrations/bayit/bayit-client.ts` | HTTP client for `/api/agent/*` + Hebrew intent detection (`detectBayitIntent`) + title matcher. Snapshot here: `bayit-client.snapshot.ts`. |
| Router intents | `src/integrations/whatsapp/message-router.ts` (in `handlePersonalMessage`, after notes intent) | brief / add / plan handled deterministically; complete is match-gated (no match → falls through to AI). **Personal chats only — groups gate untouched.** |
| Injection | `src/index.ts` (`createBayitClient()` → `createMessageRouter({ bayitClient, ... })`) | Client disabled automatically when env keys missing. |
| Env | `/opt/elad-personal-agent/.env` | `BAYIT_AGENT_KEY` (canonical source: THIS repo's `.env.local` / Vercel env — never mint new), `BAYIT_HOUSEHOLD_ID`, `BAYIT_API_URL`. |

## Phrases Kami understands (personal WhatsApp chat)

- "מה יש היום בבית?" / "מה המצב בבית" / "משימות הבית" → today's brief
- "תוסיף משימה: X" / "תוסיפי לי משימה X" / "משימה חדשה: X" → creates task
- "סיימתי את X" / "ביצעתי X" / "בוצע: X" → completes best-matching open task (no match → normal AI reply)
- "תוכנית שבועית לבית" / "תכנן לנו את השבוע בבית" → weekly plan

## Deploy procedure (HARD RULES — Kami runs from dist, not src)

```bash
# 1. backup
cp <file> /opt/backups/<name>.pre-<purpose>-$(date +%Y%m%d-%H%M%S).bak
# 2. patch via file+scp (NEVER heredoc with JS strings)
# 3. rebuild + restart
cd /opt/elad-personal-agent && PATH=/root/.bun/bin:$PATH bun run build && systemctl restart kami-agent
# 4. verify: fresh ActiveEnterTimestamp + "Starting polling" + "[bayit-client] enabled" in journal
# 5. verify groups still mention-gated (chatId.endsWith @g.us branch untouched)
```

## Live test (from the VPS)

```bash
cd /opt/elad-personal-agent && PATH=/root/.bun/bin:$PATH bun run scripts/test-bayit-live.ts
```
15 checks: intents + LIVE brief + list + add→complete write round-trip. Last run 2026-07-05: **15/15 ✅**.

## Gotchas learned

- **Hebrew FINAL letters in regex:** "תוסיף" ends with ף (final pe) — a pattern written `תוסיפי?` (regular פ) never matches it. Same for תכין/תכנן (ן). Cover both forms explicitly.
- Kami's Claude tool-use tier is a dead emergency path (revoked key) — that's WHY the integration is a deterministic pre-LLM intent, not an LLM tool.
- Never pass `deliver:"whatsapp"` from Kami — Kami IS the WhatsApp channel (double-delivery).

## Backups of the 2026-07-05 wiring

`/opt/backups/{message-router.ts,index.ts,kami.env}.pre-bayit-20260704-231117.bak`
