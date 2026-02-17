# BayitBeSeder (בית בסדר) - Progress

## Status: Deployed (Phase 3 complete - needs DB migration run)
## Last Updated: 2026-02-17

## Live URL
**https://bayit-beseder.vercel.app**

## Current State
Phase 1 (Foundation), Phase 2 (Core Tasks), and Phase 3 (Supabase Integration) are complete. App deployed to Vercel with all 10 routes working. Dashboard uses Supabase hooks with automatic fallback to mock data when DB is not connected. SQL migration ready to run.

## What Was Done
- [x] Next.js 15 project scaffolded with TypeScript, Tailwind, App Router
- [x] Supabase client utilities (browser, server, middleware)
- [x] Full database types (10 tables + Phase 3 simplified types)
- [x] SQL migration with RLS and Realtime (original: supabase/migration.sql)
- [x] Google OAuth login page
- [x] OAuth callback with auto profile creation
- [x] App shell with RTL layout, Heebo font, bottom navigation
- [x] Dashboard page with GoldenRuleRing, task overview, streak, partner status
- [x] Tasks page with category filtering
- [x] Weekly coordination sync page (5-step with timer)
- [x] Stats page with Recharts (bar chart, pie chart)
- [x] Emergency mode page (simplified, calming)
- [x] Settings page (profile, household, notifications, golden rule slider)
- [x] Gamification: CelebrationOverlay with confetti, AchievementUnlock, CoachingBubble
- [x] 50+ Hebrew coaching messages across 7 trigger types
- [x] 15 achievement definitions
- [x] 53 task templates from home maintenance plan v5.0
- [x] Seed data with category helpers
- [x] PWA manifest
- [x] Build passes with zero TypeScript errors
- [x] Deployed to Vercel (production)
- [x] Vercel env vars configured (SUPABASE_URL + ANON_KEY)
- [x] **Phase 3: Supabase migration (supabase/migrations/001_initial.sql)**
- [x] **Phase 3: lib/supabase.ts singleton client utility**
- [x] **Phase 3: useProfile hook (get/update user profile)**
- [x] **Phase 3: useTasks hook (CRUD operations for tasks)**
- [x] **Phase 3: useCompletions hook (mark complete, get history)**
- [x] **Phase 3: Dashboard updated with Supabase hooks + mock data fallback**
- [x] **Phase 3: Phase 3 types (ProfileRow, TaskRow, TaskCompletionRow, etc.)**

## Phase 3 Details

### Migration (supabase/migrations/001_initial.sql)
- profiles: id (uuid PK -> auth.users), name, avatar_url, points, streak, created_at
- categories: id (uuid PK), name, icon, color (seeded with 8 Hebrew categories)
- tasks: id (uuid PK), title, description, category_id, assigned_to, status, due_date, points, recurring, created_at
- task_completions: id (uuid PK), task_id, user_id, completed_at, photo_url, notes
- RLS policies for all 4 tables
- Auto-create profile trigger on auth.users insert
- Indexes for performance

### Hooks (src/hooks/)
- useProfile.ts: fetches current user profile from Supabase, maps to ProfileRow, supports update
- useTasks.ts: CRUD with filters (assignedTo, status, dueDate, categoryId)
- useCompletions.ts: markComplete (inserts completion + updates task status), getHistory

### Dashboard Integration
- Uses useProfile for display name and streak count
- Uses useTasks to fetch today's tasks by due date
- Uses useCompletions.markComplete when toggling tasks in DB mode
- Falls back to MOCK_TASKS when Supabase returns no data (table not created yet, no auth, etc.)
- UI design unchanged

## Remaining Steps (Need Manual Action)
1. **Run Phase 3 migration** - Paste supabase/migrations/001_initial.sql in Supabase SQL Editor
2. **Run original migration** - Paste supabase/migration.sql in Supabase SQL Editor (if not already done)
3. **Enable Google OAuth** - In Supabase Auth settings + Google Cloud Console
4. **Set site URL** - Add bayit-beseder.vercel.app as site URL in Supabase Auth

## Future Steps
1. Add Supabase Realtime subscriptions for live updates
2. Task instance generation logic (template -> daily instances)
3. Push notifications (PWA + VAPID)
4. Connect remaining pages (Tasks, Stats, Settings) to Supabase hooks
5. Partner status from real data (query other household member)

## Files Created/Modified (Phase 3)
- supabase/migrations/001_initial.sql - Phase 3 simplified schema + RLS + seed
- src/lib/supabase.ts - Singleton browser client utility
- src/lib/types/database.ts - Added Phase 3 types (ProfileRow, TaskRow, etc.)
- src/hooks/useProfile.ts - Profile hook
- src/hooks/useTasks.ts - Tasks CRUD hook
- src/hooks/useCompletions.ts - Completions hook
- src/app/(app)/dashboard/page.tsx - Updated with hooks + fallback

## Notes for Next Session
- Phase 3 migration hasn't been run yet in Supabase
- Dashboard gracefully falls back to mock data when no DB connection
- The "tasks" and "task_completions" tables are not in the generated Database type (from supabase gen types) - hooks use `as any` cast for .from() calls
- When migration is run, regenerate types with `supabase gen types typescript` to get full type safety
- Google OAuth still needs to be configured in Supabase dashboard
