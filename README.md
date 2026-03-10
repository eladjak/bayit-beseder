# 🏠 בית בסדר (BayitBeSeder)

Shared home maintenance app for couples. Hebrew RTL, mobile-first PWA with gamification.

**Live:** https://bayit-beseder.vercel.app

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS 4 + Heebo font
- **Backend:** Supabase (PostgreSQL + Realtime + Auth)
- **Animation:** Framer Motion
- **Charts:** Recharts

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL + keys

# Run dev server
npm run dev
```

Open http://localhost:3000

## Key Features

- Task management with 8 illustrated categories
- Shopping list with real-time partner sync (8 categories)
- Weekly planner with auto-scheduling
- Adaptive coaching system
- Dark mode
- WhatsApp daily briefs (Green API)
- Google Calendar sync (OAuth2)
- Web push notifications
- Partner invitation flow
- Routine playlists with timer
- Gamification (streaks, achievements, couple rewards)

## Environment Variables

See `.env.example` for all required variables.

## Deployment

Auto-deploys to Vercel from `master` branch.
