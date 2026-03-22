# בית בסדר (BayitBeSeder)

**ניהול הבית המשותף — כיפי, הוגן, ובעברית.**

Shared home maintenance app for couples and roommates. Hebrew-first RTL, mobile-first PWA with gamification, smart weekly planning, and WhatsApp integration.

**Live:** https://www.bayitbeseder.com

---

## Features

### Core
- **Task Management** — 8+ illustrated categories, points, streaks, and achievements
- **Shopping List** — Real-time partner sync, 22 grouped categories with collapsible sections
- **Weekly Planner** — Auto-scheduling with bin-packing and load balancing, drag-and-drop reorder
- **Stats Dashboard** — Completion trends, couple balance charts, personal bests

### Smart Scheduling
- **Zone-Based Planning** — Organize tasks by house zone (Kitchen, Bathroom, Living Room) for fewer context switches
- **Seasonal Mode** — Pesach/holiday templates with 37 tasks in 4 phases + 25 shopping items
- **Shabbat-Aware** — Scheduling respects Shabbat boundaries automatically
- **Google Calendar Sync** — OAuth2 integration for syncing weekly tasks

### Gamification
- Streaks and XP points per task
- Couple achievements and rewards
- Adaptive coaching messages based on completion patterns
- Celebration animations (canvas-confetti)

### Notifications & Integrations
- **WhatsApp Daily Briefs** — Morning summary via Green API
- **Web Push Notifications** — Task reminders and partner completions
- **Real-time Sync** — Supabase Realtime keeps both partners in sync instantly

### UX
- Hebrew RTL, Heebo font, fully accessible
- PWA — install from browser, works offline
- Dark mode
- Mobile-first, optimized for 375px screens
- Partner invitation flow with household management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + Heebo font |
| Backend | Supabase (PostgreSQL + Realtime + Auth) |
| Animation | Framer Motion |
| Charts | Recharts |
| Celebrations | canvas-confetti |
| Toast | Sonner |

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL + anon key

# Run dev server
npm run dev
```

Open http://localhost:3000

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

See `.env.example` for all optional variables (WhatsApp, Google Calendar, Web Push).

---

## Database Setup

Run `supabase/migration.sql` in the Supabase SQL Editor to create all tables and RLS policies.

---

## Deployment

Auto-deploys to Vercel from `master` branch. Custom domain: [bayitbeseder.com](https://www.bayitbeseder.com)
