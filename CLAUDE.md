# BayitBeSeder (בית בסדר) - Shared Home Maintenance App

## Project Overview
Home maintenance management app for 2 users (Elad & Inbal). Hebrew RTL, mobile-first PWA with gamification.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS 4 + Heebo font
- **Backend:** Supabase (PostgreSQL + Realtime + Auth)
- **Animation:** framer-motion
- **Charts:** Recharts
- **Celebrations:** canvas-confetti
- **Toast:** Sonner

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npx tsc --noEmit` - Type check

## Key Directories
```
src/app/(auth)/     → Login, OAuth callback
src/app/(app)/      → Dashboard, Tasks, Weekly, Stats, Settings, Emergency
src/components/     → Bottom nav, dashboard components, gamification
src/lib/            → Supabase clients, types, seed data, coaching messages, achievements
supabase/           → SQL migration
```

## Database
- Run `supabase/migration.sql` in Supabase SQL Editor
- Uses existing Supabase project (kidushishi)
- RLS enabled on all tables
- Realtime on: task_instances, households, streaks

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Design Notes
- RTL-first (dir="rtl", lang="he")
- Primary color: #4F46E5 (Indigo)
- Background: #FAFAF9 (Warm white)
- Font: Heebo (Hebrew-optimized)
- Mobile-first, max-width: lg (512px)
- Bottom navigation with 5 tabs
