# בית בסדר — Launch-Readiness Scorecard (2026-06-14)

Autonomous deep-work pass (team-build + safe-live-refactor). Prod stayed **200**, GEO stayed **100/100** throughout. Nothing risky was merged to prod without verification.

---

## Verdict: the core (non-payment) product is LAUNCH-READY ✅

A brand-new couple can sign up, onboard, and use the entire app end-to-end **today**. The only thing gating a *public* launch is monetization (the SUMIT webhook secret), and that does **not** block usage — `useSubscription` hardcodes the `free` tier for every user, and all base features (tasks, weekly planner, shopping, stats, gamification, coaching, multi-household, fairness meter) are ungated. SUMIT only gates the *upgrade-to-paid* extras.

---

## Scorecard

| Area | Status | Notes |
|---|---|---|
| Auth / new-user gating | ✅ Ready | RLS launch-blocker was RESOLVED & verified 2026-06-08 (only the 4 members-only `tasks` policies remain; migration-014 scoping enforced). All 7 app routes redirect unauth → `/login`, no flash/loop. |
| Onboarding (new couple) | ✅ Ready | Conversational onboarding wizard (953 lines) + household picker; register page complete (name/email/password/confirm + show-password toggle + Google OAuth). |
| Dead buttons / placeholders | ✅ Clean | 0 dead `onClick`, 0 TODO/FIXME. Only "coming soon" is the intentional upgrade CTA. |
| Empty / loading / error states | ✅ Ready | Warm `.bb-joy` empty states on tasks/shopping/stats/weekly; loading skeletons; error.tsx + not-found.tsx. |
| i18n he/en parity | ✅ 976=976 | Zero missing keys either direction (was 963=963 + my 13 new coaching keys). |
| Mobile / RTL | ✅ Ready | RTL-first, logical properties, 44px touch targets, `MotionConfig reducedMotion="user"`. |
| Free-tier usability | ✅ Ready | Every user is `free`; base features ungated → full product works with no payment. |
| GEO / SEO | ✅ 100/100 | 5-schema JSON-LD, single H1, semantic landmarks, llms.txt. |
| Prod health | ✅ 200 | bayitbeseder.com 200 on /, /dashboard, /settings, /login. |
| **Payment (SUMIT)** | ⛔ **Blocked on Elad** | Webhook returns 503 (safe-fail) until `SUMIT_WEBHOOK_SECRET` is set in Vercel. Monetization only — not a usage blocker. |

---

## What I fixed + verified + deployed this pass

**`i18n(coaching)` — coaching-insight dashboard widget** (commit `ac6710d`, merged to master `741e9be`, pushed → deployed):
- The smart-coaching insight widget on the dashboard rendered **hardcoded Hebrew even in EN mode** and was always `dir="rtl"`. This was the last deferred i18n gap (prior session left it because partial translation would've produced a worse mixed-language result).
- Wired all strings + the 4 coaching-style labels through the i18n dictionaries (13 new keys, he/en), made `dir` locale-aware. The Hebrew lib constant `COACHING_STYLE_LABELS` stays for the server-side WhatsApp messages.
- **Verified:** tsc 0 · `bun run build` green · he/en parity 976=976 · dashboard recompiles clean · prod 200 + GEO 100 held post-deploy.

---

## Precise "before launch" checklist for Elad

### Blocking (monetization only — the core app works without these)
1. **Set `SUMIT_WEBHOOK_SECRET` in Vercel** (Production). Until then the Sumit webhook returns 503 by design (anti-spoof). *This is the one true payment blocker.*
2. **Rotate the Sumit API token** (appeared in chat 2026-05-14) and confirm `SUMIT_API_KEY` is the live one in Vercel.
3. One real end-to-end ₪ charge test before declaring billing live.

### Recommended (not blocking)
4. Push the gated auth/invite hardening commit `d3a4a57` (auth-gating `allowDemo={false}` + invite service-role RLS) to prod — **Elad's tap** (it was held local, not pushed). tsc + build pass, council cleared 2 lenses.
5. Run irreversible migration **014_tasks_household_scope** on a Supabase **branch** first, then prod (coordinated with the code that reads the new column). *Note: per LAUNCH-2026-06-08, the live `tasks` RLS already enforces members-only scoping — confirm 014 state in the dashboard before re-running.*
6. Confirm `GEMINI_API_KEY` live in Vercel (AI chat + coaching tips).
7. One phone pass: login → create task → complete → confirm it shows for the other member.

### Nice-to-have (housekeeping)
8. Quarantine the stale decoy `supabase/migrations/001_initial_schema.sql` (misled the Codex audit; not the live schema).
9. Remove leftover one-off `scripts/try-migration.mjs` etc.

---

## Honest assessment
Bayit is the more launch-ready of the two flagship apps. The deep work of prior sessions (RLS resolution, i18n, Warm-Joy redesign, fairness meter, multi-household) has it in genuinely shippable shape for the core couple experience. The remaining items are **monetization wiring** (SUMIT secret — your tap) and a couple of optional DB/deploy taps. There are **no functional dead-ends** for a new user.
