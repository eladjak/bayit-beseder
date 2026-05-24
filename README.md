<div align="center">

# Bayit BeSeder

**Shared Home Management for Couples**

[English](README.md) | [עברית](README.he.md)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live](https://img.shields.io/badge/Live-bayitbeseder.com-brightgreen)](https://www.bayitbeseder.com)

A Hebrew-first, mobile-first PWA for managing household tasks together — with gamification, smart scheduling, and real-time sync.

**Live:** [bayitbeseder.com](https://www.bayitbeseder.com)

---

If you find this project useful, please star the repo — it helps others discover it!

[![Star this repo](https://img.shields.io/github/stars/eladjak/bayit-beseder?style=social)](https://github.com/eladjak/bayit-beseder)

</div>

---

## Features

### Task Management
- 8+ illustrated categories with points, streaks, and achievements
- Drag-and-drop reordering
- Adaptive coaching messages based on completion patterns

### Shopping List
- Real-time partner sync
- 22 grouped categories with collapsible sections

### Weekly Planner
- Auto-scheduling with bin-packing and load balancing
- Zone-based planning (Kitchen, Bathroom, Living Room) for fewer context switches
- Shabbat-aware — scheduling respects Shabbat boundaries automatically

### Smart Scheduling
- Seasonal mode — Pesach/holiday templates with 37 tasks in 4 phases + 25 shopping items
- Google Calendar sync via OAuth2

### Stats Dashboard
- Completion trends and couple balance charts
- Personal bests and progress tracking

### Gamification
- Streaks and XP points per task
- Couple achievements and rewards
- Celebration animations (canvas-confetti)
- **Alopik v2 mechanics** (Sprint 7.30, May 2026):
  - **Quick Love (FAB)** — bidirectional micro-recognition, rate-limited 6/recipient/day
  - **Daily Surprise Box** — first task of day reveals random reward (70% small / 25% medium / 5% large)
  - **Weekly Wheel of Fortune** — Friday 14:00 → Saturday night IDT, 8 weighted segments (experiences + gestures), 1 spin per household per ISO week
  - **Adult-toned Onboarding Wizard** — 5 steps, skippable, re-triggerable from settings
  - **Smart Guards** — block adding tasks without a reward (and vice-versa) — forces a complete game loop
  - **4-axis UX Preferences** — Theme / Haptics / Sounds / Night-mode (independent; Night-mode mutes audio + haptics + motion for not waking partner)
  - **Auto-medal trigger** — every 50 stars in `profiles.points` awards a numbered medal (PostgreSQL trigger, no client-side compute)

### Notifications & Integrations
- **WhatsApp Daily Briefs** — Morning summary via Green API
- **Web Push Notifications** — Task reminders and partner completions
- **Real-time Sync** — Supabase Realtime keeps both partners in sync instantly

### UX
- Hebrew RTL with Heebo font, fully accessible
- PWA — install from browser, works offline
- Dark mode
- Mobile-first, optimized for small screens
- Partner invitation flow with household management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + Heebo font |
| Backend | Supabase (PostgreSQL + Realtime + Auth) |
| Animation | Framer Motion |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| Celebrations | canvas-confetti |
| Monitoring | Sentry |
| Rate Limiting | Upstash (Redis) |

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- A [Supabase](https://supabase.com/) project

### Installation

```bash
git clone https://github.com/eladjak/bayit-beseder.git
cd bayit-beseder
bun install
```

### Environment Variables

```bash
cp .env.example .env.local
```

Fill in the required values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

See `.env.example` for all optional variables (WhatsApp, Google Calendar, Web Push).

### Database Setup

Run `supabase/migration.sql` in the Supabase SQL Editor to create all tables and RLS policies.

### Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Testing

```bash
bun run test          # Unit tests (Vitest)
bun run test:e2e      # E2E tests (Playwright)
```

---

## Deployment

Auto-deploys to Vercel from the `master` branch.

Custom domain: [bayitbeseder.com](https://www.bayitbeseder.com)

---

## License

[MIT](LICENSE)

---

<div align="center">

If you find Bayit BeSeder useful, please consider giving it a star!

[![Star this repo](https://img.shields.io/github/stars/eladjak/bayit-beseder?style=for-the-badge&logo=github)](https://github.com/eladjak/bayit-beseder)

</div>
