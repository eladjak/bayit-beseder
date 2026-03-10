# BayitBeSeder (בית בסדר) - Progress

## Status: LIVE
## Last Updated: 2026-03-10
## URL: https://bayit-beseder.vercel.app

## Current State
App is fully functional. All migrations applied, all features connected to Supabase, 16 illustrated categories, adaptive coaching, dark mode, PWA with push notifications. Vercel auto-deploys from master.

## Recent Work

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

## Migrations (all applied ✅)
- `001_initial.sql` + `001_initial_schema.sql` — base tables
- `002_phase5_connect_real_data.sql` — partner, points, realtime
- `003_shopping_items.sql` — shopping table + RLS
- `004_fix_rls_policies.sql` v3 — restored tasks SELECT ✅
- `005_whatsapp_phone.sql` ✅
- `006_coaching_tracking.sql` — coaching_events table ✅
- `007_expand_shopping_categories.sql` — expanded categories ✅

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
- Reply-to-complete from WhatsApp (needs dedicated Green API instance)
- i18n (English support)
- Performance optimization
