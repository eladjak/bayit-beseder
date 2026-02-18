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

---

## UI/Design Tools (MANDATORY - Feb 2026)

### Google Stitch MCP (USE FOR ALL UI WORK)
Before designing ANY UI component, page, or layout:
1. Use Stitch MCP tools: `build_site`, `get_screen_code`, `get_screen_image`
2. Generate designs in stitch.withgoogle.com first, then pull code via MCP
3. Use `/enhance-prompt` skill to optimize prompts for Stitch
4. Use `/design-md` skill to document design decisions
5. Use `/react-components` skill to convert Stitch designs to React

### Available Design Skills
- `/stitch-loop` - Generate multi-page sites from a single prompt
- `/enhance-prompt` - Refine UI ideas into Stitch-optimized prompts
- `/design-md` - Create design documentation from Stitch projects
- `/react-components` - Convert Stitch screens to React components
- `/shadcn-ui` - shadcn/ui component integration guidance
- `/remotion` - Create walkthrough videos from designs
- `/omc-frontend-ui-ux` - Designer-developer UI/UX agent

### Rule: NEVER design UI from scratch with Claude tokens. Always use Stitch MCP or v0.dev first!
