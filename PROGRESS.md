# BayitBeSeder (בית בסדר) - Progress

## Status: LIVE
## Last Updated: 2026-03-29
## URL: https://www.bayitbeseder.com
## Domain: bayitbeseder.com (Namecheap → Cloudflare DNS → Vercel)

## Current State
App is fully functional with: Pesach mode, zone-based scheduling, custom domain, security hardening, UI facelift, conversational onboarding, voice input (5 locations), Gemini AI chat, full i18n (650+ keys, 12 pages + 30+ components), beta feedback CTAs, list virtualization, page transitions, SW v5, zone wizard D&D step, multi-user members management, Upstash Redis rate limiting, WhatsApp reply-to-complete. Vercel auto-deploys from master. 178 files, 20K+ lines of code.

## Recent Work

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
