# Alopik Integration v2 — Beat Alopik at its own game

**Source:** Direct hands-on review of https://mytask-app-7dce0.web.app — every tab + every modal toured by claude-code via Chrome MCP 2026-05-24 morning.
**Goal:** Not replicate. **Improve.** Adult version, couple-focused, beat the kid app at warmth + intelligence.
**Ship gate:** This week — go to market early as possible (per Elad 24.5).

---

## What Alopik does well (learned from hands-on tour)

**Mechanics:**
- 2 reward types: 🏅 medal-redeemable (gated) vs 🎁 star-cost (progress-bar)
- Tasks: רגילות / 🔁 חוזרות / 🎁 פרס
- Filter chips: כל הילדים · נדחו · אושרו · לאישור · בביצוע · זמינות
- Approvals queue: parent approves kid completion → then stars award (anti-self-grant)
- Quick bonus button (top of every screen): instant 1/3/5/10 stars, no friction
- Encouragement send: love note to kid — **rate-limited 3h/kid** (anti-spam, preserves meaning)
- Calendar of stars (יומן הכוכבים): historical visualization

**UX patterns:**
- 5-step onboarding wizard (Welcome → Add kids → Tasks/rewards → Approvals → Achievements). Each step = 1 emoji + 1 sentence. Skippable + re-triggerable from Settings.
- **Smart guard:** can't create a task before defining at least one reward → enforces the full game-loop is set up
- **Quick suggestions** in modals (📱🍦🎢🎬🧸🍕) — eliminates blank-page anxiety
- Settings has 4 UX toggles (Haptics, Sounds, Notifications, Night-mode) AS SEPARATE from theme — Night-mode ≠ Dark-theme
- Offline indicator: "אין חיבור לאינטרנט — שינויים יסתנכרנו" (graceful PWA)
- Update banner: "✨ עדכון חדש זמין — לחץ לטעון" (no forced reload)
- 6 bottom-nav tabs, all reachable in 1 tap (max-thumb-reach mobile-first)

**Tone:**
- Kid-app: emojis everywhere, ages 6-12, parents-as-admins
- All copy is positive: "כל הכבוד", "בואו נמשיך להפוך משימות להצלחות!"
- No penalties anywhere visible — only carrots, never sticks

---

## What's wrong/missing in Alopik (room for us to win)

| Gap in Alopik | Why it matters | Our opportunity |
|---|---|---|
| Built ONLY for kids — adult use-case never modeled | Half the household work is adult work | **Our edge:** adult-couple-first |
| All rewards = parent decides | Top-down feels patronizing for adults | **Symmetric mutual-rewards** — both adults give + receive |
| No "self-reward" pathway | Adults need self-acknowledgment too | **Personal jar** — give yourself a star for hard internal work |
| Encouragement is one-way (parent→kid) | Adult relationships are bidirectional | **Mutual hearts** with 4/day soft-cap |
| No emotion data | Missing the "how I felt doing this" axis | **1-tap mood after task** (4 emojis) feeds Solis dashboard |
| No connection to real life events | Tasks live in isolation | **Calendar-aware** — "I see Inbal's birthday Wed, want to add 'plan something'?" |
| No content explanation of WHY | Just numbers, no story | **Weekly "what this week meant" auto-summary** in elad-voice tone |
| 0.1.0 — early beta, lots of empty states | Polish gap | **Ship with seeded examples** so first-run isn't barren |
| Approval queue = bottleneck | Awkward for adults to "approve" partner's task | **Replace with weekly mutual recognition** ("what did you notice this week") |
| No integration with anything | Isolated app | **Integrate**: WhatsApp daily ping via Kami, Box bridges health tasks, Solis bridges emotional |

---

## Bayit-beseder TODAY (Sprint 7.30 audit)

**Already shipped (70% of Alopik):**
- ✅ `t.points` per task
- ✅ Streak tracking (single + couple)
- ✅ Medals 🥇🥈🥉 on dashboard
- ✅ `badges-display.tsx` + `celebration-overlay.tsx` + `coaching-bubble.tsx`
- ✅ `couple-rewards.tsx` + `lib/rewards.ts` REWARDS array (movie-night etc.)
- ✅ `leaderboard.tsx` (couple-internal)
- ✅ `weekly-challenge.tsx` + `weekly-challenges.tsx`
- ✅ `weekly-share-card.tsx`
- ✅ Migration 009 `task_categories` w/ custom per-household
- ✅ Sumit subscriptions (security-patched May 15)
- ✅ Production LIVE at www.bayitbeseder.com

**Files of interest** (for council review):
- `src/lib/rewards.ts` — central rewards logic
- `src/components/gamification/` — 9 components
- `src/app/(app)/dashboard/page.tsx` — dashboard wiring
- `supabase/migrations/009_task_categories.sql` — latest schema

---

## v2 Integration Plan — 6 features to ship this week

### Phase 1 — MUST SHIP (this week, MVP for market)

#### 1. Quick Bonus button (♥️ Send Love)
**What:** Floating action button (FAB) top-right of every screen.
**Tap →** Sheet opens with 1/3/5/10 hearts choices + custom input + recipient (Elad/Inbal).
**Why:** Friction-free way to acknowledge partner mid-day. No need to navigate to task.
**Improvement over Alopik:** Bidirectional. Either partner can send to other.
**Rate-limit:** No limit on RECEIVING. Sender limited to 6/day per recipient (anti-spam, preserves meaning).
**Files:**
- `src/components/quick-love-button.tsx` (new)
- `src/lib/love-tokens.ts` (rate-limit logic + store)
- `supabase/migrations/010_love_tokens.sql` (table with sender_id/recipient_id/value/sent_at/message)

#### 2. Daily Surprise Box (first-task-of-day)
**What:** When first task of day completes, box icon appears with confetti. Tap → reveal random reward.
**Distribution:** 70% small (10-30 bonus points), 25% medium (theme/avatar unlock), 5% large (free-pass token).
**Why:** Morning ritual anchor + dopamine for getting started.
**Improvement over Alopik:** Time-of-day aware messaging ("בוקר טוב, פתחת את היום נכון").
**Files:**
- `src/lib/surprise-box.ts` (RNG + reward catalog)
- `src/components/gamification/surprise-box.tsx`
- `src/app/api/surprise-box/open/route.ts`
- migration 011

#### 3. Onboarding wizard (5 steps, adult-toned)
**What:** Replace empty-state with structured tour.
**Steps:**
1. ברוכים הבאים → 1-sentence purpose statement
2. הוסיפו זוג → couple setup
3. הגדירו 3 משימות ראשונות → seed quick-add (with smart suggestions per time-of-day)
4. הגדירו 1 פרס משותף → first couple-reward (e.g., "ערב סרט")
5. הגיעו מוכנים → "מהיום אתם משחקים. בהצלחה!"
**Improvement over Alopik:**
- **Adult tone** — not childish ("בואו נתחיל" not "🎉 ברוך הבא!")
- **Smart suggestions** that change by time-of-day
- **Skippable** + re-triggerable from settings (like Alopik)
- **Seeded examples** — not empty state
**Files:**
- `src/components/onboarding/wizard.tsx`
- `src/lib/onboarding-state.ts`

#### 4. Smart guards (Alopik's killer pattern)
**What:** Block creating task without ≥1 reward defined. Block creating reward without ≥1 task defined. Forces the LOOP to be complete.
**Why:** Alopik's biggest UX win — prevents half-built abandoned setups.
**Improvement over Alopik:** Friendly framing: "רגע, בלי פרס המשחק לא מתחיל. ניצור אחד עכשיו (30 שניות)?"
**Files:**
- Add guard middleware in `src/app/(app)/tasks/page.tsx` + `src/app/(app)/rewards/page.tsx` (new)

### Phase 2 — NICE TO HAVE (next week)

#### 5. Settings: Haptics + Night-mode (separate from dark theme)
**What:** Settings page with 4 UX toggles (Haptics, Sounds, Notifications, Night-mode).
**Night-mode ≠ Dark-theme:** Night-mode mutes notification sounds + reduces brightness + reduces motion. For not waking partner.
**Files:**
- `src/app/(app)/settings/page.tsx` (extend existing)

#### 6. Weekly Wheel of Fortune (Friday 14:00 IDT, pre-Shabbat)
**What:** 8-segment wheel with tokens (massage / breakfast-in-bed / movie / picnic / etc.).
**Trigger:** Streak ≥7 days OR completed weekly challenge.
**Why pre-Shabbat:** Aligns with Sprint 7.29 rhythm-mode. Playful Friday closing.
**Files:**
- `src/components/gamification/weekly-wheel.tsx`
- `src/lib/wheel.ts`
- migration 012

### Phase 3 — DEFERRED (post-market)

- Pets/avatars collection
- Background themes unlock
- Friend-couple opt-in invitations
- Calendar-aware suggestions (couple's shared calendar integration)
- 1-tap mood after task (Solis bridge)
- Weekly "what this week meant" auto-summary (in elad-voice tone via Kami)

---

## Principles (NON-NEGOTIABLE — from Elad's Alopik post + couple-fit)

1. **NO penalties** — only positive reinforcement. Missing tasks = silent reset, no shame.
2. **NO invasive partner tracking** — partner sees their own data + shared aggregates. NEVER "Inbal completed X% of tasks" red-flagged.
3. **NO ads, NO public sharing with strangers**
4. **Closed environment** — household_id RLS enforces (already done)
5. **Self-compete > peer-compete** — personal historical bests > vs other couples
6. **Warm, not childish** — adult tone, soft animations ≤200ms, no cartoon overload
7. **Mobile-first** — Alopik insight: works ONLY on smartphone. We optimize for ≤414px first.
8. **Symmetry** — Alopik is asymmetric (parent vs kid). We are symmetric (Elad ↔ Inbal). Every feature must work bidirectionally.

---

## Council brief (for parallel review)

Send to GPT-5.5 + Grok-4.20 + Gemini-3.1-Pro via `council-of-sages`:

> בודק את האפליקציה אלופיק (kid task gamification, https://mytask-app-7dce0.web.app) ואת bayit-beseder שלנו (couple homemaking app, prod at bayitbeseder.com). מצורף ה-spec הזה. שאלות:
> (1) מהן 3 התובנות הכי גדולות מ-Alopik שאנחנו לא רואים בעצמנו?
> (2) האם הפיצול ל-Phase 1/2/3 נכון? מה צריך להגיע לpre-market launch השבוע?
> (3) מה הסכנות הספציפיות של הטמעת מנגנון כמו "Quick Love button" בזוגיות במצב משבר (קונטקסט מצורף)?
> (4) האם הSpec הזה רואה משהו שאלעד לא ביקש? cull aggressive.

## Codex CLI brief (for backend review)

Send to Codex via VPS `codex exec`:

> Review `/opt/elad-personal-agent/...` no — review locally `~/projects/bayit-beseder/src/lib/rewards.ts` + `src/components/gamification/*` + `supabase/migrations/*`. Question: given this Spec, write the exact migration SQL for `love_tokens` + `surprise_box` + `wheel_spins` tables with proper RLS. Output ONLY SQL, no commentary. Single file: `supabase/migrations/010_alopik_v2_tables.sql`.

---

## Ship gate (Phase 1 → market)

- [ ] Phase 1 features (#1-#4) all implemented + typecheck + ultracite pass
- [ ] Migrations 010+011 applied to prod Supabase
- [ ] RLS verified by household-isolation test
- [ ] Sentry quiet
- [ ] Mobile UX tested live on iPhone (PWA add-to-home)
- [ ] Inbal-friendly tone review (Solis voice-check)
- [ ] WhatsApp daily ping wired (Kami announces: "today: 3 tasks queued, surprise box available")
- [ ] Soft launch — 10 couples in inner circle
- [ ] Feedback form at `/feedback` (1-question: "מה הרגשת השבוע?")

**Built:** 2026-05-24 07:55 IDT Sprint 7.30
**Reviewer:** Direct UI tour via Chrome MCP — every tab + every modal walked
**Owner:** claude-code (implementation), Kami (coordination), Kaylee (deploy guard), Solis (tone review)
**Status:** Spec v2 ready for Council review → implementation Phase 1 starts after sign-off
