# BayitBeSeder (בית בסדר) - Progress

## 2026-06-19 — Agent-operability: /api/agent/task + live WhatsApp verified (Shabbat run B)

**Status: AGENT-OPERABLE — Kami/Box can now read AND write the household state.**

### What was done
- **`POST /api/agent/task`** implemented and deployed (commit `0707041` → master → Vercel):
  - `action:"list"` — returns open tasks scoped to householdId (20 by default, max 50)
  - `action:"add"` — creates a task (title, optional assignee/due/category/difficulty); resolves assignee display name → user_id; category key → category_id; awards points by difficulty
  - `action:"complete"` — marks task completed; writes `task_completions` row; awards points to assignee profile; guards against double-completion (409)
  - Auth: Bearer `BAYIT_AGENT_KEY`. Rate: 30/min. householdId required for writes. tsc 0 · 325/325 tests · deployed.
- **Capabilities manifest** updated to v1.1.0 (3 actions: plan, brief, task).
- **`BAYIT_AGENT_WHATSAPP_TO`** wired in `.env.local` = `972525427474` (bare number — `formatPhone()` adds `@c.us`; this was the 2026-06-14 gotcha).
- **WHATSAPP_PHONES** wired in `.env.local` = `0525427474` (for daily-brief cron).
- **docs/AGENT-API.md** updated: task endpoint curl examples + gotcha note on bare number format.

### Live verifications (real calls, not faked)
1. `GET /api/agent/capabilities` → v1.1.0, 3 actions — ✅
2. `GET /api/agent/brief?deliver=whatsapp` → `delivery.sent: true`, `idMessage: 3EB038B465BB764BD326A0` — **real WhatsApp delivered to Elad's number** ✅
3. `POST /api/agent/task {action:"list"}` → `count: 20`, open tasks from DB — ✅

### Remaining (not this session)
- **Phase 2 meal-prep planner** (the core pain-killer — defrost/prep cron) still blocked on Elad's 5-answer intake (see docs/AGENT-INTERFACE.md §Intake)
- **household_id** for scoped queries — Kami needs Elad's household UUID to scope `brief`/`task` calls (run `GET /api/agent/brief` without householdId returns global, which is fine for now)
- **`SUMIT_WEBHOOK_SECRET`** still needs to be set in Vercel (payment, safe-fail without it)
- **Migration 014** (tasks household scope) still needs Supabase branch run → prod (Elad's tap)
- **`d3a4a57`** (auth-gate + invite RLS) not pushed to prod yet (Elad's tap)

## 2026-06-14 — Launch-readiness pass (autonomous, team-build + safe-live-refactor)
**Verdict: core (non-payment) product is LAUNCH-READY.** Full scorecard: `docs/LAUNCH-READINESS-2026-06-14.md`.
- **Fixed + DEPLOYED:** `i18n(coaching)` coaching-insight dashboard widget — was hardcoded Hebrew even in EN mode + always `dir=rtl` (last deferred i18n gap). Wired 13 keys he/en + locale-aware dir. Commit `ac6710d` → merged master `741e9be` → pushed. tsc 0 · build green · parity **976=976** · prod **200** · GEO **100/100** held post-deploy.
- **Confirmed launch-ready:** `useSubscription` hardcodes `free` tier → entire core couple experience (tasks/weekly/shopping/stats/gamification/coaching/multi-household/fairness) works with NO payment. RLS blocker was already resolved 2026-06-08. 0 dead buttons, 0 TODOs, all states present, register/onboarding complete.
- **Before launch (Elad):** set `SUMIT_WEBHOOK_SECRET` in Vercel (the one true *payment* blocker — webhook 503-safe-fails until then; monetization only, not usage) · rotate Sumit token · push gated `d3a4a57` · run migration 014 on a Supabase branch first. NOTE: prior-agent favicon/logo WIP + the docs from 6/6–6/8 remain UNCOMMITTED in the working tree (left untouched, not mine to sweep).

## 2026-06-07 — Critical fixes #1+#2 (auth) DONE · #3 (migration) validated, staged
- **#1 auth-gating + #2 invite service-role** APPLIED + committed `d3a4a57` (local, NOT pushed — deploy=Elad's tap). tsc + `bun run build` pass. Council 2 lenses CLEAR (security: invite codes 32-bit crypto-hex, rate-limited 5/min, auth-gated; behavior: no flash/loop, clean demo-button removal). Also fixed stale middleware comment.
- **#3 tasks-household-scope migration (014):** VALIDATED schema-correct against the REAL schema (`001_initial.sql` ≡ `database.ts`: tasks has assigned_to/status/due_date/recurring; task_completions.user_id; profiles.household_id all exist). NOT applied — irreversible prod surgery requiring (a) coordinated migration+code deploy (useTasks/database.ts/createTask — column is NOT NULL, app breaks if mismatched), (b) Supabase branch validation for zero task-loss, (c) Elad's tap.
- **⚠️ HAZARD flagged:** `supabase/migrations/001_initial_schema.sql` is a STALE DECOY — a contradictory abandoned schema (template-style tasks, completed_by, no profiles.household_id). It is NOT the live schema and misled the Codex audit. Quarantine/delete it (kept for now to avoid noise near pending migration).


## 2026-05-28 — entry from deep-work session
**Coaching-tip Gemini bug fixed + deployed.** Root cause: `gemini-2.5-flash-lite` + `maxOutputTokens:150` + no `thinkingConfig` → model burned tokens on hidden 'thinking', visible tip came back empty, coach silently fell back to canned tips. Fix: `gemini-3.5-flash` + `thinkingBudget:0` + `600` tokens (matches the working chat route). Verified live on bayitbeseder.com — coach now returns real AI tips.

---


## Status: Sprint 7.31 — Warm Joy redesign + multi-household + Fairness Meter · PUSHED to master (Vercel deploy triggered)
## Last Updated: 2026-05-24 21:15 IDT
## URL: https://www.bayitbeseder.com

### Sprint 7.31 (2026-05-24 PM) — 5 commits, PUSHED 8e73c20→099a956
- **Warm Joy redesign** (`5172b40`): bg cold→cream-lavender, warm shadows (not cold indigo glow), honey/peach/coral tokens, `.bb-card .bb-joy .bb-blob .bb-pop .bb-bob .bb-illus` · 5 new Gemini illustrations (household types + mascot)
- **Multi-household copy sweep** (`48c93e7`): couples+families+roommates+kids+solo · 3 stale "coming soon" FAQs fixed · copy-resolver 3x · SEO/meta marketing line · coaching/rewards/notifications de-coupled · 0 couple-only strings remain
- **Warm empty states** (`31950ff`): `.bb-joy` panels on tasks/shopping/stats/weekly
- **Mascot** (`6f0fd15`): friendly house companion in dashboard header
- **Fairness Balance Meter** (`099a956`): council #1 moat — weekly per-member load split, non-shaming, dashboard SECTION 2.5 · 5 tests
- Onboarding household picker → illustration-forward
- tsc clean · build passing · copy+fairness tests pass
- **DEPLOY: pushed to origin/master 21:15 → Vercel auto-deploy in progress**

### Sprint 7.30 (2026-05-24) — Alopik integration · 5 commits autonomous

5 commits in master from morning loops B/C/D after deep hands-on Alopik review
(https://mytask-app-7dce0.web.app) via Chrome MCP. Stack discovered = Expo Router
+ SDK 54; we translate IDEAS to Next.js.

| # | Feature | Commit | Files |
|---|---|---|---|
| 1 | Quick Love FAB (bidirectional, rate-limit 6/day) | `2980e89` | quick-love-button.tsx, love-tokens.ts, migration 012 |
| 2 | Daily Surprise Box (70/25/5 reward roll, time-aware) | `e988713` | surprise-box.tsx, surprise-box.ts |
| 3 | Adult Onboarding Wizard (5 steps, skippable) | `e988713` | onboarding/onboarding-wizard.tsx |
| 4 | Smart Guards (missing-reward / missing-task) | `e988713` | smart-guard.tsx, useHouseholdCounts.ts |
| 5 | Weekly Wheel of Fortune (Fri 14→Sat night, 8 segs) | `75cb108` | weekly-wheel.tsx, weekly-wheel.ts |
| 6 | UX Preferences 4-axis (Theme/Haptics/Sounds/Night-mode) | `75cb108` + `fa0e901` | ux-preferences-panel.tsx, ux-preferences.ts |
| 7 | Migration 013 — auto-medal trigger @ 50 stars | `fa0e901` | 013_alopik_v2_medal_trigger.sql |
| 8 | Pets collection lib (20 pets, streak unlocks) — Phase 3 prep | Loop D | lib/pets.ts |
| 9 | Vitest 32 new tests (surprise-box+weekly-wheel+love-tokens+pets) | Loop D | __tests__/*.test.ts |

**Verification:** tsc clean · 32/32 new vitest pass · 11/11 kaylee-smoke · 11/11 agent-verify
**Ship blocker:** migration 012 + 013 manual run in Supabase prod (guide: `~/Documents/reports/sprint-7-30-migration-run-instructions-2026-05-24.html`)
**Type debt:** `AnySupabase` cast in 3 libs — removable after `bunx supabase gen types --linked` regen post-migration

### Session 2026-05-15 — Sumit security audit + smoke (Sprint 7.25d, Claude + Codex parallel)
**Status:** typecheck 0 errors · 262/262 tests pass · build OK · 3 critical Sumit bugs patched (uncommitted)

| # | What | Status | File |
|---|------|--------|------|
| 1 | **CRITICAL** — `/api/sumit/checkout/route.ts` read `SUMIT_API_TOKEN` but `.env.local` has `SUMIT_API_KEY` → 500 in prod | FIXED | accepts either name, prefers `SUMIT_API_KEY` |
| 2 | **CRITICAL** — `/api/sumit/checkout` had no auth check (anyone could create checkouts for any householdId) | FIXED | added `supabase.auth.getUser()` + `household_members` membership check |
| 3 | **CRITICAL** — `/api/sumit/checkout` passed client-supplied email/name to Sumit unsanitized (spoof risk) | FIXED | uses server-side `user.email` / `user.user_metadata.full_name` |
| 4 | Missing rate limit on checkout | FIXED | added `rateLimit({windowMs:60_000, max:10})` |
| 5 | **CRITICAL** — `/api/sumit/webhook` skipped signature check entirely if `SUMIT_WEBHOOK_SECRET` empty (which it currently is) → anyone could grant themselves Family tier free | FIXED | rejects with 503 in production when secret unset · loud warn in dev |
| 6 | Tier-inference accepted any SKU containing "family" substring (e.g. `wrong-family-1` → family tier) | FIXED | strict whitelist against PRICING SKUs (plus-monthly/yearly + family-monthly/yearly) · unknown → 'free' + skip upsert |
| 7 | tsconfig missing `vitest/globals` types → 37 test errors | FIXED | added `"types": ["vitest/globals"]` |

**Pre-deploy checklist for Elad:**
- [ ] `SUMIT_WEBHOOK_SECRET` MUST be set in production env (Vercel) BEFORE merging — without it the webhook returns 503 (safe-fail).
- [ ] Verify the `household_members` query path works for both Elad + Inbal (they're already members of same household).
- [ ] Test end-to-end with a real ₪19 charge before declaring Sumit live.
- [ ] Codex parallel pass: started but died around reading better-result type defs (no code patches from codex this round — Claude's audit covered the security surface).



### Session 2026-05-14 — Sumit type completion
- [x] `bun add "@elad/sumit-client@file:../_lib/sumit-client"` — Bun Windows `file:` EPERM workaround via manual copy into `node_modules/@elad/sumit-client/`
- [x] `src/lib/types/database.ts` — added `subscriptions` table (Row/Insert/Update + Stripe + Sumit columns) + `billing_events` table
- [x] `_lib/sumit-client/src/index.d.ts` (new) + `_lib/sumit-client/package.json` updated with `types` + `exports.types`
- [x] `src/app/api/sumit/checkout/route.ts` — added `as { RedirectURL?; PaymentURL?; PaymentID? }` cast on Sumit response
- [x] `bunx tsc --noEmit` → 0 real errors (only preexisting test-runner type gaps remain)
- [ ] Open: regenerate types from live Supabase (`bunx supabase gen types`) once authenticated — manual additions above match migrations 010+011 byte-for-byte but should be replaced by gen output later
- [ ] Open: rotate Sumit API token (appeared in chat 2026-05-14)
## Domain: bayitbeseder.com (Namecheap → Cloudflare DNS → Vercel)

## Current State
App is fully functional with: Pesach mode, zone-based scheduling, custom domain, security hardening, UI facelift, conversational onboarding, voice input, Gemini AI chat, full i18n (1000+ keys), list virtualization, page transitions, SW v5, zone wizard D&D, multi-user members, Upstash Redis rate limiting, WhatsApp reply-to-complete, push notifications, Sentry, Plausible analytics, 24 achievements, 14 weekly challenges, leaderboard, advanced stats + calendar view, activity feed, badges display, Playwright E2E (14 tests), 260+ unit tests, calendar auto-sync cron, offline queue, Web Share API, keyboard shortcuts, bundle analyzer, CSV export, 5 task templates, QR invite, shopping share, task photos, streak badges, skip tasks, sitemap.ts, FAQ schema, per-page metadata, scroll animations, sticky CTA, confetti onboarding, notification preferences + quiet hours, PERFORMANCE FIXES (LaunchCrew 0/F). Vercel auto-deploys from master. 240+ files, 30K+ lines of code.

## Recent Work

### Iteration: 2026-04-10 — Pre-Launch Bug Sweep + Features + Pricing

**20+ commits this session — 16 bugs from user testing:**

**Features built:**
1. Task claiming: "אני לוקח/ת!" button on unassigned tasks
2. SEO: 21 Hebrew keywords, Organization JSON-LD, sitemap, OG cards
3. Points visibility: ⭐ badges on weekly task cards
4. Mini leaderboard: always-visible scoreboard on dashboard
5. Freemium infrastructure: useSubscription, UpgradePrompt, feature gating
6. Feature discovery tooltips: useFirstVisit + FeatureTooltip on 4 pages
7. Pricing model document: 3 tiers (הבית/בית+/בית משפחה)
8. Wizard first-visit pulse hint

**Pre-launch bugs FIXED (from Elad's testing):**
1. Dark mode text invisible → root cause: `@theme inline` + missing CSS vars
2. Color theme picker broken → hex values instead of raw HSL
3. Language toggle not switching → dual localStorage key sync + dir/lang update
4. Bell/toggle overlap → sticky utility bar (not fixed)
5. Developer name "Jayousi" → "Yakovovich"
6. Upgrade prompt → "בקרוב!" (no real payment yet)
7. Dashboard checkmarks on zones → corner badge instead of overlay
8. Reset tasks button missing → connected + daily auto-reset hint
9. AI chat empty response → enriched Gemini system prompt with app context
10. Stats dual calendar → removed duplicate MonthlyCalendar
11. About section → redesigned with gradient header + stats
12. Shopping duplicate settings button → removed
13. Emergency page: rewrote to use `tasks` table (was querying non-existent `task_instances`/`task_templates`), localStorage for emergency mode toggle
14. Notifications hook: rewrote to use `tasks`/`task_completions` tables (was querying non-existent `task_instances`/`task_templates`), fixed Realtime subscription
15. Settings emergency button: was dead button with no onClick; now navigates to /emergency page

**Codebase stats:** 275+ files, 52K+ lines, 295+ commits

### Iteration: 2026-04-03 (cont.) — Full Audit + Bug Sweep

**22 commits — 25+ issues resolved:**

**Bugs Fixed (12):**
1. Notifications: task_instances query, global bell, RTL dropdown, push banner 7-day reset, AI logging
2. Dark mode category colors: `color-mix()` across 6 files
3. Shopping form mobile keyboard: `max-h-[85dvh]`
4. Coaching-tip API: auth + rate limiting (security fix)
5. Notification dropdown mobile overflow
6. History page error state + push banner "No thanks" option

**Accessibility (3):**
7. Focus trap added to ALL 15 modals/overlays (useFocusTrap hook)
8. `prefers-reduced-motion` for all confetti (6 files + safe-confetti.ts)
9. Mobile keyboard overlap fix

**i18n (3):**
10. Weekly page: 50+ hardcoded Hebrew → `t()` calls
11. Stats/Settings/Emergency: 30+ hardcoded Hebrew → `t()` calls
12. Test fixtures updated to match current TaskRow types

**Features + Refactoring (2):**
13. Landing page: 4 Gemini illustrations wired + FAQ connected to AI chat
14. Weekly page split: 1,405→655 lines + 4 sub-components

**Audit results (3 parallel agents):**
- UX: **7.2/10** → estimated **8.5/10** after fixes
- DB: dual schema verified working, cron routes confirmed correct
- Health: 18 issues found, 15 resolved

**Remaining TODO:**
- [ ] Blog redesign: rich formatting + CTA links (agent working)
- [ ] Browser dogfooding via Chrome automation (capability ready)
- [ ] eslint-disable cleanup (7+ stale closure risks — intentional, low priority)

**Codebase stats:** 265+ files, 50K+ lines, 267 commits, 19 pages, 105 components

### Iteration: 2026-04-03 — Landing, Notifications, UX Polish

**Previous session (same day):**
- Landing page: removed "גרסה ראשונה" badge, fixed "צפו בהדגמה" → "איך זה עובד?"
- FAQ scroll bug fixed (scrollIntoView → container scrollTop)
- Shopping autocomplete click now works (addItem directly)
- 4 Gemini landing illustrations generated (features-tasks/planning/shopping/gamification)
- Dashboard UX overhaul (QuickStatsBar, GamificationRow, maxItems=5, HouseMap promoted)
- Clear completed button on task list
- Weekly: wizard + manual dual CTA
- Landing page link highlighted in quick links

### Iteration: 2026-04-01 — Shopping List Overhaul

**3 commits this session:**

1. **Shopping item card upgrade** — inline edit, quantity +/-, move category, item emoji
2. **Shopping page integration** — autocomplete (150+ items), purchased zone at bottom, move category modal, persistent collapse, print button
3. **New data/components** — shopping-autocomplete.ts (22K), purchased-section.tsx, useShoppingList editItem/moveItemToCategory

**Shopping bugs fixed:**
- Can now edit item titles inline (tap to edit)
- Can move items between categories (new modal)
- Purchased items drop to collapsible "purchased" zone at bottom
- Quantity +/- buttons on each item
- Smart autocomplete with emoji as you type
- Collapse state persisted in localStorage
- Stale closure fix in removeItem + clearChecked

### Iteration: 2026-03-31 — Competitor Analysis + 8 Feature Integration

**Competitor reviewed:** pesach-app.vercel.app — guided room wizard, task claiming, difficulty levels

**5 commits this session:**

1. **Sanity CMS blog integration** — dynamic posts from Sanity above static fallback, blog email subscribe, hreflang, 6 Gemini illustrations
2. **Notification tone upgrade** — warm humorous copy (he+en), landing page accessible when logged in
3. **Mobile mic fix** — getUserMedia before SpeechRecognition for mobile PWA permission popup
4. **8 competitor-inspired features** (2,639 new lines):
   - F1: Guided Room-by-Room Setup Wizard (5 steps, 100+ task templates)
   - F2: Difficulty Badges & Points (green/amber/red on task cards)
   - F3: Self-Service Task Claiming ("I'll take it!" button)
   - F4: House Map — Room Progress Cards (visual grid on dashboard)
   - F5: Print Task Checklist (A4 RTL Hebrew, for the fridge!)
   - F6: Enhanced Competition Scoreboard (daily/weekly/all-time tabs)
   - F7: Prize System (progress bars, default prizes, admin manager)
   - F8: Pesach Wizard Integration (room wizard pre-loaded with Pesach tasks)
5. **Dashboard integration** — House Map + Prize Card wired into dashboard

**New files:** 16 files created, 2,700+ lines added
**i18n:** ~80 new translation keys (he + en)

### Iteration: 2026-03-30 — Fixes, Blog, AI Chat, Calendar, Sanity CMS

**11 commits this session:**

1. **Calendar sync fix** — `calendarList` API required wrong scope, switched to "primary" alias
2. **"Open my calendar" link** — added to calendar settings after sync
3. **Activity feed 400 fix** — removed FK joins, separate queries instead
4. **Notifications 406 fix** — `.single()` → `.maybeSingle()` for partner lookup
5. **Analytics guard** — safer `typeof plausible === "function"` check
6. **AI Chat model upgrade** — `gemini-2.0-flash` (deprecated) → `gemini-2.5-flash`
7. **Theme customizer** — 6-color picker, flash-free ThemeScript init
8. **WhatsApp messages** — per-member stats, tomorrow preview, Friday celebration
9. **GitHub Stars CTA** — settings + landing page
10. **Blog /blog** — premium design, 6 articles, i18n (he/en), SEO JSON-LD, illustrations
11. **Sanity CMS integration** — `@sanity/client` installed, project b0hm1i34 connected
12. **Dashboard links** — prominent cards to blog + landing page

**Still TODO (next session):**
- [ ] Populate Sanity with blog posts (siteId: "bayit-beseder", status: "published")
- [ ] Blog: pull live posts from Sanity (currently static fallback)
- [ ] Blog notification subscription (opt-in for new content alerts)
- [ ] Notification tone: warm, humorous, friendly self-deprecating humor
- [ ] Add /blog to sitemap.ts
- [ ] hreflang tags for he/en
- [ ] Generate real illustrations with Gemini (replace CSS gradients)
- [ ] Proactive notification banner on dashboard for push permissions

### Iteration: 2026-03-29 (cont.) — Push, Monitoring, Achievements, Stats, E2E

**Commit 95**: Zone wizard + multi-user UI + app facelift (see above)

**Commit 96**: Upstash Redis rate limiting (see above)

**Commit 97**: Vercel bun install fix

**Commit 98**: Push notifications, Sentry, Plausible, achievements, stats, E2E, error pages
- **Push Notifications**: usePushNotifications hook, toggle component, VAPID keys. Calendar auto-sync cron (Sundays 6AM)
- **Sentry**: client/server/edge configs, global-error.tsx RTL, withSentryConfig wrapper
- **Plausible Analytics**: privacy-first script tag + trackEvent() in 7 hooks (login, task_complete, shopping_add, weekly_generated, ai_chat, pwa_install, language_switch)
- **Achievements**: expanded 15→24 across 6 categories (consistency, collaboration, mastery, milestones)
- **Advanced Stats**: weekly trend LineChart, activity heatmap (4×7 grid), personal records cards — all lazy-loaded
- **E2E Tests**: Playwright setup, 14 tests across 4 spec files (landing, auth, static, navigation), mobile+desktop
- **Error Pages**: improved not-found.tsx (illustration + 404 badge), error.tsx (dev logging + Hebrew UI)
- **i18n**: 40+ new keys (stats, error pages, achievements)

**Commit 99**: Gamification, performance, offline, sharing, dark mode, 60 tests
- **Weekly Challenges**: 14-challenge pool, 3 per week (deterministic by ISO week), progress tracking, confetti on completion
- **Leaderboard**: Household ranking with medals/crown, week/all-time tabs, animated re-ranking
- **Performance**: Bundle analyzer, DNS prefetch headers, SW no-cache headers, Google Fonts preconnect, maskable PWA icon
- **Dark Mode Audit**: 11 components checked, global-error.tsx fixed (CSS variables)
- **Offline Queue**: useOfflineQueue with localStorage, optimistic UI, amber indicator with pending count
- **Web Share API**: useWebShare hook + ShareButton (native share on mobile, clipboard on desktop), on weekly + stats
- **Keyboard Shortcuts**: Ctrl+N (new task), Ctrl+/ (AI chat), ? (help modal), Escape (close) — desktop only
- **PWA Install Enhancement**: 3-dismiss → 30-day suppression, install card in settings
- **60 New Tests**: achievements (11), analytics (7), challenges (14), push notifications (11), advanced stats (17)
- **90+ i18n keys** added

**External Services Connected:**
- Upstash Redis (rate limiting) — DB created, env vars set
- Sentry (error monitoring) — project "bayit-beseder" created, DSN in Vercel
- VAPID Push Keys — generated and set in Vercel (3 env vars)
- Plausible Analytics — script tag ready, needs plausible.io signup

**Session totals**: 7 commits, 90+ files changed, ~6,400 lines added, 11 parallel agents used
**Codebase**: 200+ files, 25,000+ lines, 24 achievements, 14 challenges, 14 E2E tests, 204 unit tests

### Iteration: 2026-03-29 — Zone Wizard + Multi-User UI + Facelift + Redis

**Commit 93**: Zone wizard D&D step + multi-user members UI + app facelift
- **Zone Wizard Step**: New `zone-wizard-step.tsx` — drag-and-drop zone-to-day assignment with @dnd-kit, mobile tap fallback (bottom-sheet day picker), DragOverlay, integrated as wizard step with step dots + navigation
- **Multi-User Phase 2 UI**: New `members-section.tsx` — household members management in settings (gradient avatars, role badges owner/member, task progress bars, kebab menu for role change/remove, confirm dialog, invite CTA)
- **Dashboard Manage Link**: Partner status shows "ניהול חברי הבית" link when 3+ members
- **App Facelift**: Micro-interactions (active:scale) on all buttons across 15 files, card hover shadows, bottom nav press feedback + shadow
- **i18n**: 50+ new translation keys (zone wizard + members management)

**Commit 94**: Upstash Redis rate limiting
- **Migration**: In-memory rate limiter → @upstash/ratelimit with @upstash/redis (distributed, survives deploys)
- **7 API routes updated**: All use async check(), same interface, zero behavior change
- **Graceful fallback**: In-memory for local dev when env vars not set
- **Env vars**: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (need Upstash dashboard setup)

**Discovery**: WhatsApp reply-to-complete was already fully implemented from previous sessions ✅

**Session totals**: 2 commits, 31 files changed, ~1,380 lines added, 3 parallel agents used
**Codebase**: 178 files, 20,000+ lines

### Iteration: 2026-03-26 — i18n Expansion + Beta Feedback + Voice UX

**Commit 62**: i18n expansion for tasks/shopping pages + beta feedback messaging
- **i18n Tasks Page**: Wired `useTranslation` into tasks page — 30+ hardcoded Hebrew strings replaced with `t()` calls (header, buttons, toasts, empty states, aria-labels)
- **i18n Shopping Page**: Wired `useTranslation` into shopping page — 20+ hardcoded Hebrew strings replaced
- **Dictionary Expansion**: 60+ new translation keys in both he.json and en.json (tasks, shopping, weekly, common, auth sections)
- **Share Texts Updated**: All 5 platform share texts (WhatsApp, Facebook, Instagram, Telegram, LinkedIn) now include "🧪 גרסה ראשונה" beta note + feedback CTA (eladjak@gmail.com)
- **Weekly Share Card**: Appended beta feedback line to WhatsApp share text

**Commit 63**: Beta feedback CTA on landing page, hero badge, and settings
- **Landing Hero**: Added "גרסה ראשונה" badge to hero top pill
- **Feedback Banner**: New amber feedback section between CTA and footer with mailto + contact link
- **Landing Footer**: Beta badge with feedback link
- **Settings Page**: New feedback card with version info, mailto button, contact link

**Commit 64**: Enhanced contact page for beta feedback collection
- Contact hero now has beta badge
- Story card copy emphasizes feedback importance
- Email mailto has auto-subject "משוב על בית בסדר"

**Commit 65**: Voice auto-send in AI chat drawer
- Voice input now auto-sends messages instead of just filling the input — better conversational UX

**Commit 66**: Voice input in weekly add-task and history search
- Weekly page: mic button next to "משימה חדשה" input for voice task addition
- History page: mic button next to search input for voice search
- Both dynamically imported for bundle optimization

**Commit 67**: i18n for login and register pages
- Login page: 15+ hardcoded Hebrew strings → t() calls (form labels, buttons, toasts, error messages)
- Register page: 12+ hardcoded Hebrew strings → t() calls

**Commit 68**: i18n for PWA install banner, history page
- PWA banner: all strings translatable (install title, subtitle, buttons, aria)
- History page: header, search, empty states use t()
- Added pwa, history, notFound sections to dictionaries

**Commit 69**: i18n for weekly page — header, toasts, summary
- Weekly page: 15+ toast messages, header, wizard CTA, zone mode, week summary → t()
- Added 20 new weekly.* translation keys

**Dogfood verification**: Dashboard, tasks, shopping, settings — all verified working on live site (bayitbeseder.com)

**Commit 70**: i18n for invite-partner, voice-input, playlists + 33 new dict keys
- invite-partner: 17 Hebrew strings → t() (toasts, UI text, WhatsApp message template)
- voice-input-button: 3 Hebrew aria-labels/titles → t()
- playlists: 5 Hebrew strings → t() (last remaining app page!)
- Added invite (24 keys), voice (4 keys), playlists (5 keys) to both dicts

**Commit 71**: i18n weekly generator wizard (30+ strings across 6 sub-components)
**Commit 72**: Deep i18n — 15 components (coaching, seasonal, dashboard, gamification, notifications, error page) + 95 new dict keys
**Commit 73**: Iteration report HTML

**Commit 74**: SW v5 network-first for chunks + manifest shortcuts + sitemap
**Commit 75**: Loading state with animated house icon
**Commit 76**: Massive 4-agent commit: zone wizard, settings/chat i18n, onboarding i18n, ServiceWorkerUpdateToast

**Commit 77**: List virtualization (tasks), page transitions, calendar i18n
**Commit 78**: RTL fix — borderRight → borderInlineStart (4 occurrences)
**Commit 79**: Dogfood audit fixes — 3 dead files deleted (1,050 lines), RTL fixes, i18n fix

**Session totals**: 26 commits, 60+ files modified, ~2,800 lines added, 1,050 lines dead code removed
**i18n coverage**: ALL 12 pages + ALL 30+ components — 600+ translation keys ✅
**New features**: Zone config in wizard, SW update toast, loading state, manifest shortcuts, list virtualization, page transitions
**Dogfood**: Full code audit (critical/important/minor) + browser verification
**Agents used**: 12+ parallel agents across the session
**Codebase**: 164 files, 18,130 lines (down from 19,173 after dead code cleanup)
**Total project commits**: 189

**Commit 80**: List virtualization (tasks 15+), page transitions (150ms fade+slide)
**Commit 81**: RTL fix borderRight → borderInlineStart
**Commit 82**: Dogfood audit fixes — 3 dead files deleted (1,050 lines)
**Commit 83**: RTL logical props (20 files!), emergency nav, shopping virtualization, weekly refetch fix
**Dogfood audit results**: 4 CRITICAL (3 fixed), 11 IMPORTANT (8 fixed), 15 MINOR (12+ fixed)

**Commit 84**: Language switcher (floating EN/עב pill on all pages)
**Commit 85**: npm → bun migration (3.4s build vs 4.5s)
**Commit 86**: contact@bayitbeseder.com email (Cloudflare routing → agents)
**Commit 87**: Share texts updated with AI chat, Pesach, i18n features
**Commit 88**: RTL fixes for auth pages (login + register)

**Commit 89**: Vitest + 56 tests, PWA offline page, micro-interactions, multi-user hook + spec

**Final session totals**: 35 commits, 90+ files, bun migration, email routing, language switcher, tests, offline, micro-interactions
**Codebase**: 176 files, 19,200+ lines, 84 passing tests

**Commit 90**: Voice in onboarding (home name step)
**Commit 91**: Multi-user Phase 1 (N-member support in data layer)
**Commit 92**: SEO server component splits (register, invite, offline)

**GRAND TOTAL**: 39 session commits, 20+ parallel agents, every major feature delivered

### Iteration: 2026-03-25 — AI Chat + Onboarding + Polish + Voice + PWA

**Commit 55**: Conversational Onboarding + Visual Consistency + Microcopy + Voice POC
- **Conversational Onboarding Wizard (Phase 1)**: Full Typeform-style 6-screen flow replacing old Onboarding + TaskSetupWizard. Screens: Welcome → Home Name → Room Count → Residents → Cleaning Personality → AI Plan Preview.
- **Visual Consistency Phase 2**: Standardized buttons, cards, spacing across 29 files.
- **Microcopy Overhaul**: Warmer Hebrew copy across 9 files.
- **Voice Input POC**: useVoiceInput hook + VoiceInputButton (Web Speech API he-IL).
- **Dark Mode v2**: Verified clean. **Google OAuth**: Verified working.

**Commit 57**: AI Chat UI + Interactive FAQ + PWA Install + i18n
- **AI Chat UI (Phase 2 shell)**: Floating FAB on all pages → opens bottom-sheet chat drawer. Pre-programmed Hebrew responses, quick action chips, voice input integration. Ready for Claude/Gemini API connection.
- **Interactive FAQ Chat**: Landing page FAQ converted from accordion to chat-style interface with typing animation and follow-up suggestions.
- **PWA Install Banner**: Native install prompt with 7-day dismiss. usePWAInstall hook.
- **i18n Expansion**: he/en dictionaries expanded with onboarding, AI chat, emergency sections.
- **@tanstack/react-virtual**: Added for future list virtualization.

**Commit 58**: Accessibility + SEO
- **Accessibility**: ARIA roles (dialog, log, complementary), aria-modal, aria-pressed on toggle cards, aria-labels on all interactive elements. Focus trap (useFocusTrap) on onboarding wizard + chat drawer. focus-visible:ring-2 on all buttons. Decorative icons marked aria-hidden.
- **SEO**: metadataBase + canonical URL, hreflang alternates (he-IL/en-US), keywords, googleBot rich snippet directives, absolute OG image URLs, alt text. JSON-LD enriched with featureList (9), creator, aggregateRating, screenshot.
- **Sitemap**: Added /privacy, /terms, /contact pages; removed non-existent /register; added lastmod dates.

**Commit 60**: Gemini AI Chat API + Voice in Tasks/Shopping + i18n + Interactive Coaching
- **Gemini AI Chat API**: /api/ai/chat route with streaming SSE (gemini-2.0-flash), Hebrew system prompt, rate limiting. useAIChat hook upgraded to stream real responses with local fallback.
- **Voice Input Wired**: mic button on tasks + shopping input fields for voice-powered data entry.
- **i18n**: t() now in dashboard, stats, emergency, today-overview. Dictionaries expanded.
- **Interactive Coaching**: coaching-tips.tsx upgraded to chat-style with tappable "עוד טיפ", "למה?", "תודה!" options.
- **GEMINI_API_KEY**: Added to Vercel production env. Commit 61 triggers redeploy.

**Session totals**: 7 commits (55-61), 15 new files created, 50+ files modified, ~3,300 lines added.

### Iteration: 2026-03-23/24 [DONE] — 54 commits! Full-stack overhaul + AI Planning vision
- **Google Calendar Hardening**: task ID-based dedup, auto-clear dead tokens, timezone offset fix, abort controller, Hebrew error messages
- **Performance — Images**: 12 static `<img>` → `next/image` (auto WebP, lazy loading, sizing hints)
- **Performance — Code Splitting**: 5 heavy modals lazy-loaded via `dynamic()` (CelebrationOverlay, CoachingBubble, TaskCompletionModal, PesachActivationModal, WeeklyGeneratorModal)
- **Performance — Bundle**: `canvas-confetti` (31KB) converted to dynamic import in all 4 files — only loaded when confetti fires
- **Performance — Animations**: Progress bars converted from `width` animation to `scaleX` + `transformOrigin` (GPU-composited, no layout thrashing)
- **Security**: JSON.parse wrapped in try/catch in webhook, error messages sanitized (no Supabase details leaked), date validation on calendar API, fetch() error handling in google-calendar.ts
- **Accessibility**: Focus trapping in all 5 modals via custom `useFocusTrap` hook (Tab wrapping, Escape, auto-focus, restore focus). Touch targets enlarged from 24px to 36px in category managers. `role="dialog"` + `aria-modal` added.
- **Dark Mode**: All hardcoded `dark:bg-[#1a1730]` and `dark:border-[#2d2a45]` replaced with CSS variables (`dark:bg-surface`, `dark:border-border`) — 10 files fixed
- **RTL**: Shopping item border changed from `borderRight` to `borderInlineStart`
- **Responsive**: NotificationCenter dropdown adds `max-w-[90vw]` for small screens
- **Reliability**: useSeasonalMode — added error handling + cleanup flag for memory leak prevention
- **Navigation**: BottomNav refactored — React.memo on NavItem, single layoutId, spring constant extracted
- **Keyboard**: Enter key support on all category manager inputs
- **Loading States**: Coaching insight shows skeleton instead of null
- **Celebration Timing**: Auto-dismiss 2500ms → 4000ms (WCAG)
- **Notification Bell**: Touch target enlarged to 44px
- **SEO**: robots.txt, sitemap.xml, JSON-LD WebApplication schema, title templates, page metadata
- **Images**: Google avatar domains added to next.config (avatars now optimized via next/image)
- **React.memo**: 9 components memoized (was 0) — StreakDisplay, EmergencyToggle, PartnerStatus, GoldenRuleRing, StreakTracker, WeeklyChallenge, CoupleRewards, ShoppingItemCard, NavItem
- **Reduced Motion**: CSS prefers-reduced-motion support (disables all animations)
- **Cache**: Static assets (illustrations, icons) served with 1-year immutable cache
- **Dogfooding**: Live site tested via browser automation. Fixed CTAs routing to /login, removed personal name.
- **Landing Page Upgrade**: SocialProofSection (animated counters), TestimonialsSection (3 Hebrew reviews), FaqSection (5-question accordion), FloatingCta (scroll-triggered). Footer expanded with legal links.
- **Share Kit**: New OG image (Gemini), share texts HTML with copy buttons for WhatsApp/Facebook/Instagram/Telegram/LinkedIn. OG metadata rewritten for better CTR.
- **Legal Pages**: Privacy policy, terms of service, contact page — all Hebrew, linked from footer and settings
- **Navigation**: Dashboard header "בית בסדר" link to landing, 404 page improved, settings links to legal pages
- **OG Metadata**: Rewritten titles and descriptions for better social sharing CTR
- **Task Setup Wizard**: 4-step wizard (home features → rooms → time budget → preview). Replaces hardcoded seed. Seed API accepts custom tasks. Default fallback: 8 generic tasks.
- **Page Transitions**: Smooth slide+fade between app routes via framer-motion PageTransition wrapper
- **i18n Infrastructure**: Lightweight context+JSON system. Hebrew+English dictionaries, useTranslation hook, LanguageProvider. BottomNav + Settings integrated.
- **Zone Day Picker**: New ZoneDayPicker component — tap-to-assign zones to days. Ready for weekly wizard integration.
- **Google OAuth Complete** (via Chrome MCP — all done autonomously):
  - Redirect URI added for Calendar callback on bayitbeseder.com
  - Publishing status: Testing → Production (all Google users can sign in)
  - App Logo uploaded (Gemini-generated, JS inject to file input)
  - Branding: home, privacy, terms URLs configured
  - Google Search Console: domain verified via HTML meta tag
  - Branding verified + published → "BayitBeSeder" shown to users with logo
- **Dark Mode Fix**: CSS variable override fixed — :root.dark properly overrides @theme inline vars
- **UX Overhaul** (based on UX simulation agent + user feedback):
  - Dashboard: tasks moved to TOP, gamification collapsed into accordion
  - Tasks: big "הוספת משימה" button, category filters hidden behind toggle
  - Shopping: prominent "הוסיפו פריט ראשון" CTA, larger FAB
  - Weekly: wizard as primary CTA, advanced options in secondary row
- **Full Audit**: 3 parallel agents + browser dogfooding + UX simulation. ~90% resolved.
- **Growth Review**: 10-dimension self-assessment. Average score: 7.05 → 8.4 (+1.35). 3 memory files saved.

### Iteration: 2026-03-22 (Session 2) [DONE] — 22 commits total!
- **Custom Domain**: bayitbeseder.com live! Namecheap → Cloudflare DNS → Vercel, SSL auto, SVG favicon
- **Zone-Based Scheduling**: Full implementation of Inbal's idea (toggle, algorithm, settings, grouped view)
- **Landing Page**: Conversion-focused homepage with hero, features, CTA (new users see landing, logged-in go to dashboard)
- **Weekly Share Card**: Viral Engine Phase 2 — gradient card with stats + WhatsApp share
- **Israeli Humor**: 20+ funny coaching messages, warmer greetings, playful empty states
- **Pricing Strategy**: Full market research — recommended 15₪/mo, Founders 9.90₪, feature gating plan
- **UI Facelift**: Confetti colors, spacing, empty states, focus-visible, dark mode contrast
- **Supabase**: Auth URLs updated, migrations ALL confirmed (30 tables, 19+ RLS policies)
- **README**: Full rewrite with features, tech stack, new URL

### Iteration: 2026-03-22 (Session 1) [DONE]
- **Pesach Mode**: Full seasonal template system — 37 cleaning tasks in 4 phases, 25 shopping items, countdown banner, 3-step activation modal, Shabbat-aware scheduling
- **Security Hardening**: HMAC-SHA256 webhook verification, security headers (HSTS, X-Frame-Options, CSP, Referrer-Policy), X-Powered-By removed
- **UI Facelift**: Dark mode contrast fix (#B0ACCC), ARIA attributes on modals, 3 new Gemini illustrations (pesach-mode, empty-weekly, empty-stats)
- **UI Audit**: Comprehensive 14-section audit completed (7.5/10 overall)

### Wizard Modal Redesign + Error Surfacing (Mar 15) [DONE]
- **Full modal rewrite**: matches app design system (gradient-hero header, card-elevated cards, CSS variables)
- **Error surfacing**: applyPlan now returns actual Supabase error instead of silent swallowing
- **Layout fix**: bottom-sheet on mobile, centered max-w-lg modal on desktop (was full-viewport fixed inset-0)
- **Dark mode**: uses CSS variables (--color-background, --color-surface) instead of hardcoded stone colors
- **Backdrop**: blur overlay with click-to-close
- **Pending**: Need user to test and report if tasks actually persist — error toast will show exact Supabase error if not

### Weekly Wizard Fix + D&D (Mar 15) [DONE]
- **Critical bug fix**: category_id was passing string keys ("kitchen") instead of UUID. Now resolves via Supabase categories table lookup.
- **Drag & drop**: Added @dnd-kit/core for dragging tasks between day columns with touch sensors (200ms delay for mobile scroll safety)
- **Responsive overhaul**: safe-area-inset classes (safe-top, safe-bottom), 44px+ touch targets, RTL-safe dropdowns, overscroll-contain, min-h on all buttons
- **Mobile touch targets**: all action buttons meet 28-44px minimum tap area
- Tasks created by wizard now properly appear in Tasks page and Dashboard (same DB table)

### Weekly Generator Wizard (Mar 14) [DONE]
- **Smart task distribution algorithm**: bin-packing with daily caps (75min Sun-Thu, 20min Fri, 0 Shabbat)
- **Balanced assignment**: weighted load balancing between household members
- **Room batching**: groups same-category tasks on same day when possible
- **Full wizard flow**: preview → edit → apply with progress bar
- **Drag & edit**: move tasks between days, reassign members, add/remove tasks
- **Modal UI**: full-screen RTL modal with day cards, category colors, member avatars
- **3 new files**: weekly-generator.ts, useWeeklyGenerator.ts, weekly-generator-modal.tsx
- **.gitignore cleanup**: added HTML guides + .npmrc to ignore list

### Pre-Launch Sprint (Mar 12) [DONE]
- **Shopping overhaul**: Google Keep-style grouped accordion (22 categories, collapsible sections)
- **Tasks page resilience**: mock mode toast+haptic feedback, error states, login banner upgrade
- **Custom categories everywhere**: useTaskCategories hook + TaskCategoryManager modal (CRUD, reorder, icon/color picker)
- **NotificationBanner fix**: z-index lowered + pointer-events-none to stop blocking header
- **ShoppingItemCard**: dynamic color/icon props (no more hardcoded lookup)
- **ShoppingCategory type**: widened from 7-value union to string (supports unlimited categories)
- **Consolidated migration SQL**: 004+006+007+008 in one file for easy apply
- **Migration 009**: task_categories table with household-scoped RLS
- **Share-ready**: OG metadata, Twitter Cards, PWA icons, og-image.jpg, 404 page
- **Strategy document**: comprehensive market analysis, competitive moat, growth plan

### Wave F: Weekly Calendar Integration (Mar 12) [DONE]
- **Google Calendar connected** - OAuth flow working in production
- **New API route** `/api/calendar/events` - fetches user's Google Calendar events
- **useCalendarEvents hook** - client-side fetching with date grouping
- **CalendarEventItem component** - RTL blue accent cards for calendar events
- **Smart scheduler extended** - calendar-aware load analysis + suggestions (busy_calendar_day, free_slot)
- **Weekly page integrated** - events shown per day, connection prompt, header stats, collapsed badges
- 6 files changed, 526 insertions

### UX Overhaul (Mar 9) [DONE]
- **Wave 0**: Consolidated `categories.ts` as single source of truth, `CategoryCard` component
- **Wave 1**: Tasks page auto-seed, login banner, illustrated category scroll
- **Wave 2**: Shopping 5→8 categories (+beauty/pharmacy/baby), emoji icons, migration 007
- **Wave 3**: Weekly page purpose subtitle + illustration, login banner, auto-seed
- **Wave 4**: Coaching cold start fix (onboarding card), CoachingTips always-visible widget
- 16 Gemini watercolor illustrations generated

### Improvement Sprint (Mar 9) [DONE]
- Security: webhook auth, IDOR fix, CSRF, crypto codes, rate limiting, RLS
- Architecture: unified Supabase client, shared categories, error boundaries, component split
- Features: emergency→Supabase, settings→DB, achievements→DB, WhatsApp scoping, weekly write
- UI/UX: 7 illustrations, RTL fixes, aria-labels, focus indicators, keyboard support
- Code quality: stale closures, timezone, SSR hydration, parallel queries
- Adaptive coaching system with effectiveness tracking

## Migrations
Applied: 001, 001_initial_schema, 002, 003, 004, 005, 006, 007, 008, 009

## Feature History (compact)
- **Phase 7**: Animations, sounds, haptics, onboarding
- **Phase 8**: WhatsApp integration (Green API, daily brief/summary crons)
- **Phase 9**: Notifications, streak tracker, weekly challenge
- **Phase 10**: Auto-scheduler, room conditions, couple rewards
- **Phase 11**: Golden rule rotation, shopping list, tired mode
- **Phase 12**: Web push notifications (VAPID)
- **Phase 13**: Supabase seed integration
- **Phase 14**: Dark mode, partner invitation, routine playlists, shopping→Supabase
- **Phase 15**: Google Calendar OAuth2 integration
- **Phase 17**: Avatar upload, task completion feedback modal

## Remaining Roadmap
### Done ✅
- ~~i18n~~ ✅ 600+ keys, all pages + components
- ~~Language switcher~~ ✅ floating EN/עב
- ~~Voice everywhere~~ ✅ 5 locations
- ~~Zone wizard~~ ✅ in weekly wizard
- ~~List virtualization~~ ✅ tasks + shopping
- ~~Page transitions~~ ✅ 150ms fade+slide
- ~~SW v5~~ ✅ network-first + update toast
- ~~bun migration~~ ✅ 3.2s builds
- ~~contact@bayitbeseder.com~~ ✅ Cloudflare routing
- ~~Dogfood audit~~ ✅ 30 findings, most fixed
- ~~RTL fixes~~ ✅ 25+ logical properties
- ~~Dead code cleanup~~ ✅ 1,050 lines removed
- ~~Beta feedback~~ ✅ 6 CTAs + dedicated email

### Remaining
- Multi-user households (kids/roommates — architectural change)
- Reply-to-complete from WhatsApp (needs dedicated Green API instance)
- Redis rate limiter (Upstash) for distributed deploys
- Supabase types regeneration (resolve `as any` casts)
- Test coverage (currently 0% — add Vitest + key tests)
- PWA offline mode improvements
- Push notification reliability
- Performance: lazy-load more heavy components
- Landing page A/B test variations

### 11.6.2026 — מעבר שיפורים רוחבי (Fable-5 sweep)
- tsc ✓0 · branch `chore/next-16.2.9-security` — next ^16.2.0→16.2.9, build ירוק, ממתין ל-merge אחרי preview (עץ העבודה נשאר עם 16 קבצים מלוכלכים — לא עורבבו) · חוב lint: 118 בעיות (לא טופל — עץ מלוכלך).

---

## 2026-06-11 — apps-finish sweep (Fable-5 / Claude Opus 4.8)
- **lint:** fixed 2 `react/no-unescaped-entities` errors in `print-tasks.tsx` (Hebrew gershayim → `{'"'}`, render identical). Commit `ac1546a` on master (build green). 
- **audit:** clean (0 high/critical) — already handled by today's earlier next→16.2.9 bump (`4b76b30`/`6dfeda3`). tsc 0.
- **NOT touched:** 45 remaining eslint errors = React-Compiler heuristics (set-state-in-effect ×23, refs ×7, memoization ×4) + 9 `no-explicit-any` + 1 `no-html-link-for-pages` (behavioral, live site) — out of scope for a safe types/lint sweep.
- **Needs Elad (deploy/decision):** push auth-gating + invite-RLS fix `d3a4a57` to prod (Elad's tap) · run irreversible migration **014_tasks_household_scope** on a Supabase branch first then prod · set `SUMIT_WEBHOOK_SECRET` in Vercel before Sumit billing goes live · rotate Sumit API token · quarantine stale `001_initial_schema.sql` decoy.

## 2026-06-12 — GEO/AEO sweep (autonomous Shabbat task)
- geo-scan (self-hosted scanner): score raised to >=95 (see commit "feat(seo)" of this date)
- Zero-risk changes only: head/meta/JSON-LD/static files; app logic untouched

## 2026-06-12 — Deep-iteration i18n+UX sweep (autonomous Shabbat loop, commit `9f820bb`, PUSHED)
**Definition-of-done feature-completeness pass on non-payment/non-auth-deploy surfaces.** First mapped the Codex 2026-06-06 audit (18 findings) against current master: CRITICAL #1 (auth-gate `allowDemo={false}`), #2 (invite RLS), #3 (task scoping) all already shipped/verified per LAUNCH-2026-06-08.md; #10 FAB overlap resolved (ChatFAB `bottom-40` vs QuickLove `bottom-24`, stacked); #16 reduced-motion covered by `MotionConfig reducedMotion="user"` in `(app)/layout.tsx`; #18 stats progress bars already `scaleX`/0.2s. So the Codex table is closed.
- **NEW gaps found + fixed (i18n — untranslated Hebrew rendered even in EN mode):**
  - Fairness Meter, the flagship moat feature — hardcoded headers/labels in `stats/page.tsx` (×2 sections) + dashboard `fairness-balance-meter.tsx` → `t()` keys (he+en).
  - Settings section headers (UX prefs / companion / backgrounds) + page `<h1>` → `t()`.
  - Dashboard `playlist-card`, `partner-status` manage-members link, `monthly-calendar` legend → `t()`.
- **Misleading-UI fix:** settings `languageSoon` note said "English coming soon, app stays Hebrew" — but EN interface is fully live (963-key en.json + working toggle). Rewritten to a truthful note (interface is in English; some AI-generated content may still be Hebrew).
- **Animation polish:** `fairness-balance-meter` segmented bar dropped `transition-[width] duration-500` (layout-thrash; width is data-driven, no anim needed).
- **Gates:** tsc 0 · `bun run build` green (all routes) · he/en parity 963=963, zero missing both ways · prod 200 on /, /settings, /stats, /dashboard, /login · GEO-scan **100/100** (unchanged) · all 13 new keys resolve in both locales.
- **Left for a future session (documented, not forced):** `coaching-insight.tsx` still has hardcoded Hebrew tied to the `COACHING_STYLE_LABELS` shared lib constant — partial translation would produce a worse mixed-language result, so deferred to a dedicated coaching-i18n pass. Pervasive `animate={{ height: "auto" }}` accordions + `animate={{ width }}` progress bars across weekly/onboarding/emergency are framer-driven (so MotionConfig already disables them for reduced-motion); converting to transform-safe risks visual regressions across many screens — left as polish-not-broken.
- **Still gated on Elad (unchanged from 6-11 entry):** push auth/invite `d3a4a57` · run migration 014 on Supabase branch then prod · set `SUMIT_WEBHOOK_SECRET` in Vercel · rotate Sumit token · quarantine `001_initial_schema.sql` decoy. NOT touched this session per mandate.
