# BayitBeSeder - Comprehensive Improvement Plan
## Generated: 2026-03-09 | Based on 4 Parallel Agent Reviews

---

## Executive Summary

4 specialized agents reviewed the entire codebase across code quality, UI/UX, security, and architecture. Below is a prioritized work plan organized into phases.

**Overall score: 6.5/10** - The app works and looks good, but has critical security gaps, architectural debt (dual data models), and several hardcoded/mock sections that need to become real.

---

## Phase A: Security Fixes (URGENT - Do First)

### A1. WhatsApp Webhook Authentication [CRITICAL]
**File:** `src/app/api/whatsapp/webhook/route.ts`
- Webhook accepts ANY request with no authentication
- Anyone who discovers the endpoint can complete any task in the system
- **Fix:** Validate `body.instanceData.idInstance` matches `GREEN_API_INSTANCE_ID` env var
- **Also:** Restrict to known sender phone numbers

### A2. Push Subscribe IDOR [CRITICAL]
**File:** `src/app/api/push/subscribe/route.ts`
- POST/DELETE accept `userId` in body with zero authentication
- Attacker can overwrite any user's push subscription, redirecting their notifications
- **Fix:** Authenticate request, verify `userId` matches authenticated user

### A3. Fix RLS Policies in Production Supabase [CRITICAL]
**Files:** `supabase/migrations/001_initial.sql` lines 77-121
- `profiles` SELECT: `using (true)` - exposes Google Calendar OAuth tokens to anyone
- `tasks` SELECT: `using (true)` - any user reads all tasks
- `tasks` INSERT/UPDATE/DELETE: only checks `authenticated` role, not ownership
- `task_completions`: same issue - cross-user inserts possible
- **Fix:** Drop permissive `001_initial` policies, verify only `migration.sql` policies (household-scoped) are active

### A4. Google Calendar OAuth CSRF [HIGH]
**Files:** `src/app/api/calendar/connect/route.ts`, `src/app/api/auth/callback/google-calendar/route.ts`
- No state parameter validation in OAuth callback
- **Fix:** Generate random state token, store in cookie, validate in callback

### A5. Invite Code Uses Math.random() [HIGH]
**File:** `src/app/api/invite/route.ts:13`
- **Fix:** Use `crypto.getRandomValues()` or `crypto.randomBytes()`

### A6. Add Rate Limiting [HIGH]
- No rate limiting on any of 14 API endpoints
- Most critical: `/api/invite/join` (code brute-force), `/api/whatsapp/webhook`
- **Fix:** Add Vercel rate limiting or lightweight middleware

### A7. Sanitize OAuth Error Parameter [MEDIUM]
**File:** `src/app/api/auth/callback/google-calendar/route.ts:27`
- **Fix:** `encodeURIComponent(error ?? "no_code")`

### A8. Minimize Webhook Response Data [MEDIUM]
**File:** `src/app/api/whatsapp/webhook/route.ts`
- Currently returns task titles in response body
- **Fix:** Return only `{ ok: true }`

---

## Phase B: Architecture Cleanup

### B1. Unify Supabase Client [CRITICAL]
**Files:** `src/lib/supabase.ts` vs `src/lib/supabase/client.ts`
- Two browser clients: singleton vs per-call. Auth events may not sync between them
- **Fix:** Delete `src/lib/supabase/client.ts`, unify all imports to `src/lib/supabase.ts`

### B2. Extract Shared Category Mapping [HIGH]
**Files:** Duplicated in 5 files (dashboard, tasks, stats, history, weekly)
- `CATEGORY_NAME_TO_KEY` copy-pasted everywhere
- **Fix:** Create `src/lib/categories.ts` with shared constants

### B3. Wire Partner Status to Real Data [HIGH]
**File:** `src/app/(app)/dashboard/page.tsx:541-553`
- Partner name "ענבל" and counts 3/8 are hardcoded literals
- `usePartner` hook fetches real data but result is never used
- **Fix:** Connect `partner` data from hook to `PartnerStatus` component

### B4. Fix Hardcoded Invite Code in Settings [HIGH]
**File:** `src/app/(app)/settings/page.tsx:414`
- Shows `"BAYIT-ABC123"` instead of real invite code
- Real code only shown in `InvitePartner` component below
- **Fix:** Use real invite code from profile/household data

### B5. Fix Hardcoded bestStreak [MEDIUM]
**Files:** `dashboard/page.tsx:481`, `stats/page.tsx:400`
- `bestStreak={12}` hardcoded everywhere
- **Fix:** Store and read from `profiles.best_streak` or compute from completions

### B6. Remove Orphaned Database Tables or Integrate Them [MEDIUM]
- 5+ tables never read by UI: `task_templates`, `task_instances`, `household_members`, `streaks`, `achievements/user_achievements`, `weekly_syncs`, `coaching_messages`
- Auto-scheduler writes to `task_instances` but UI reads from `tasks`
- **Decision needed:** Either wire these tables to UI or drop them to reduce confusion

### B7. Add React Error Boundaries [MEDIUM]
- No Error Boundary in the component tree
- Any render error crashes the entire app
- **Fix:** Add `error.tsx` files per route segment

### B8. Split Large Page Components [LOW]
- Dashboard: 590 lines, 10+ hooks
- Settings: 790 lines, 15+ sections
- **Fix:** Extract into sub-components and custom hooks

---

## Phase C: Feature Completeness

### C1. Emergency Page - Connect to Supabase [HIGH]
**File:** `src/app/(app)/emergency/page.tsx`
- Fully mock - uses static seed data, no DB reads/writes
- `households.emergency_mode` field never toggled
- **Fix:** Integrate with tasks table and household settings

### C2. Settings - Save to Database (not localStorage) [HIGH]
**File:** `src/app/(app)/settings/page.tsx`
- Household name: localStorage only, not saved to `households`
- Golden rule target: localStorage only, not in `households.golden_rule_target`
- WhatsApp phone: localStorage only, not stored in profile
- **Fix:** Save to Supabase tables

### C3. WhatsApp Webhook User Scoping [HIGH]
**File:** `src/app/api/whatsapp/webhook/route.ts:55-61`
- Queries tasks without user/household filter - returns ALL users' tasks
- Phone number not cross-referenced to any profile
- **Fix:** Store phone numbers in profiles, filter tasks by matched user

### C4. Playlists - Persist Completions [MEDIUM]
- Completing playlist steps not recorded as task completions
- **Fix:** Save to `task_completions` when playlist step is done

### C5. Achievements - Use Database Table [MEDIUM]
- Currently computed client-side with simplified heuristics
- `user_achievements` table exists but is never read
- **Fix:** Write achievements server-side, read in stats page

### C6. Weekly Page - Add Write Capability [LOW]
- Currently read-only display
- No drag-and-drop or task assignment to specific days
- **Fix:** Add task creation/reassignment per day

---

## Phase D: UI/UX & Accessibility

### D1. Add Illustrations to Empty States [HIGH] -- DONE
Generated 7 Gemini illustrations in `public/illustrations/`:
- `tasks-done.jpg` - All tasks completed celebration
- `empty-tasks.jpg` - No tasks today, day off
- `empty-shopping.jpg` - Empty shopping list
- `welcome-home.jpg` - Login/welcome screen
- `playlist-cleaning.jpg` - Cleaning playlists
- `stats-achievements.jpg` - Stats/achievements
- `emergency-mode.jpg` - Emergency mode

**Remaining:** Integrate these into the actual components (replace emoji-only empty states with illustrated ones)

### D2. Fix Task Completion Modal RTL [CRITICAL]
**File:** `src/components/task-completion-modal.tsx:104`
- Close button positioned `left:4` instead of `right:4` (wrong for RTL)
- **Fix:** Change to `right-4` or use logical property `inset-inline-start`

### D3. Add aria-labels to All Interactive Elements [HIGH]
Missing on 15+ buttons:
- Bottom nav links
- Emergency toggle, Energy mode toggle
- Shopping item checkboxes
- Category filter chips across all pages
- **Fix:** Add descriptive Hebrew aria-labels

### D4. Add Visible Focus Indicators [HIGH]
- No consistent focus ring styling on buttons
- Bottom nav items lack keyboard focus indicators
- **Fix:** Add `focus-visible:ring-2 focus-visible:ring-primary` globally

### D5. Convert Height Animations to Transform [HIGH]
**Files:** `shopping/page.tsx:178`, `task-completion-modal.tsx:178`
- Animating `height` causes layout thrashing
- **Fix:** Use max-height or transform-based animations

### D6. Standardize Spacing Across Pages [MEDIUM]
- Dashboard: `space-y-5`, Tasks: `space-y-4`, Shopping: `space-y-4`
- **Fix:** Normalize to `space-y-4` throughout

### D7. Add Keyboard Support to Star Rating [MEDIUM]
**File:** `src/components/task-completion-modal.tsx`
- Stars only respond to mouse click/hover
- **Fix:** Add arrow key navigation and Enter to select

### D8. Fix Manifest Theme Color [LOW]
**File:** `public/manifest.json`
- `theme_color: "#4F46E5"` but CSS uses `#6366F1`
- **Fix:** Update manifest to match

### D9. Improve Service Worker Caching [LOW]
**File:** `public/sw.js`
- Only caches 3 URLs (/, /dashboard, /manifest.json)
- **Fix:** Pre-cache all app routes and add cache versioning

---

## Phase E: Code Quality

### E1. Fix Stale Closure in useShoppingList [HIGH]
**File:** `src/hooks/useShoppingList.ts:317`
- `toggleItem` captures stale `items` from render time
- Rapid toggles can send wrong values to Supabase
- **Fix:** Use ref or functional state update for the Supabase call

### E2. Fix Hardcoded Timezone in Google Calendar [HIGH]
**File:** `src/lib/google-calendar.ts:385`
- `+03:00` hardcoded; Israel has +02:00 in winter
- **Fix:** Use `Intl.DateTimeFormat` to resolve current offset dynamically

### E3. Fix SSR Hydration Mismatch in Weekly Page [MEDIUM]
**File:** `src/app/(app)/weekly/page.tsx:89-90`
- `Math.random()` during render causes server/client mismatch
- **Fix:** Generate mock data in `useState` initializer or `useEffect`

### E4. Fix Missing useCallback Dependency [MEDIUM]
**File:** `src/components/NotificationBanner.tsx:62`
- `useCallback(async () => { ...user... }, [])` - empty deps but uses `user`
- **Fix:** Add `user` to dependency array

### E5. Fix Module-Level Counter in useNotifications [MEDIUM]
**File:** `src/hooks/useNotifications.ts:154`
- `let idCounter = 100` resets on HMR, collides across tabs
- **Fix:** Use `crypto.randomUUID()` for notification IDs

### E6. Extract Utility Functions from Hooks [LOW]
- `computeConsecutiveStreak`, `formatRelativeTime` exported from `useNotifications`
- **Fix:** Move to `src/lib/streak-utils.ts` and `src/lib/date-utils.ts`

### E7. Remove Console Statements [LOW]
- ~30 `console.log/error/warn` in production code
- **Fix:** Remove or replace with structured logger

### E8. Parallelize usePartner Queries [LOW]
**File:** `src/hooks/usePartner.ts`
- Two sequential queries that could run in parallel
- **Fix:** Use `Promise.all()`

---

## Priority Execution Order

| Priority | Phase | Items | Effort |
|----------|-------|-------|--------|
| 1 | A - Security | A1-A6 | 1-2 days |
| 2 | B - Architecture | B1-B4 | 1 day |
| 3 | D - UI/UX | D1-D5 | 1 day |
| 4 | C - Features | C1-C3 | 2 days |
| 5 | E - Code Quality | E1-E4 | 1 day |
| 6 | B - Architecture (rest) | B5-B8 | 1 day |
| 7 | C - Features (rest) | C4-C6 | 2 days |
| 8 | D/E - Polish | D6-D9, E5-E8 | 1 day |

**Total estimated: ~10 working days for complete improvement pass**

---

## Generated Visual Assets

| File | Usage | Size |
|------|-------|------|
| `/illustrations/tasks-done.jpg` | Dashboard - all tasks completed | 342KB |
| `/illustrations/empty-tasks.jpg` | Dashboard/Tasks - no tasks today | 365KB |
| `/illustrations/empty-shopping.jpg` | Shopping - empty list | 348KB |
| `/illustrations/welcome-home.jpg` | Login/Register pages | 343KB |
| `/illustrations/playlist-cleaning.jpg` | Playlists page header | 446KB |
| `/illustrations/stats-achievements.jpg` | Stats page - achievements section | 291KB |
| `/illustrations/emergency-mode.jpg` | Emergency page header | 248KB |
