# BayitBeSeder (בית בסדר) - Progress

## Status: LIVE
## Last Updated: 2026-03-23
## URL: https://www.bayitbeseder.com
## Domain: bayitbeseder.com (Namecheap → Cloudflare DNS → Vercel)

## Current State
App is fully functional with Pesach mode, zone-based scheduling, custom domain, security hardening, and UI facelift. Vercel auto-deploys from master.

## Recent Work

### Iteration: 2026-03-23 [DONE] — 7 commits! Performance, Security, Accessibility & Polish
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
- **Full Audit**: 3 parallel agents ran (perf: 30 issues, UI/UX: 120+ issues, security: 9 issues). ~50% of critical/high items resolved this iteration.
- **Growth Review**: 10-dimension self-assessment saved. Average score: 7.05 → 7.85 (+0.8)

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
- Google OAuth Verification (for sharing with friends - guide created)
- Reply-to-complete from WhatsApp (needs dedicated Green API instance)
- i18n (English support)
- Performance optimization
