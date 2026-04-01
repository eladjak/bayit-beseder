# UX Overhaul Plan — Dashboard-First Redesign
## BayitBeSeder — 2026-04-01

---

## The Problem

The dashboard grew from 5 sections to 20+ sections stacked vertically. New features (HouseMap, PrizeCard, AI Tips, Scoreboard) are buried under 44 scrollable tasks. Users never see them.

**Current dashboard scroll depth:** ~3000px (20+ sections)
**Visible above fold:** Only greeting + Pesach banner + first 3 tasks

---

## Design Principles

1. **Progressive Disclosure** — Show summaries first, details on tap
2. **Task-First** — Today's tasks are always the hero, but limited to 5 with "show more"
3. **Cards Grid** — Multi-column cards for features (not single vertical stack)
4. **Tabbed Sections** — Related features grouped in tabs, not stacked
5. **Sticky CTAs** — Key actions always reachable
6. **Mobile-First, Desktop-Aware** — Works on 375px, looks great at 768px+

---

## Dashboard Redesign (The Big Change)

### New Layout: Sections with Collapsible Task List

```
┌─────────────────────────────┐
│  Header (greeting + date)   │
│  Pesach Banner (if active)  │
├─────────────────────────────┤
│  Quick Stats Bar            │  ← NEW: 4 mini cards in a row
│  [0/8 today] [🔥3] [⭐45] [🏆#1] │
├─────────────────────────────┤
│  Today's Tasks (max 5)      │  ← CHANGED: only 5 shown, "show all" expands
│  ┌────────────────────────┐ │
│  │ Task 1  [קל 5] [🤚]   │ │  ← with difficulty + claim
│  │ Task 2  [בינוני 10]    │ │
│  │ Task 3  [קשה 20]       │ │
│  │ Task 4                  │ │
│  │ Task 5                  │ │
│  └────────────────────────┘ │
│  [הצג עוד 39 משימות ▼]     │  ← collapsed by default
├─────────────────────────────┤
│  House Map (2-col grid)     │  ← PROMOTED: visible immediately
│  ┌──────┐ ┌──────┐         │
│  │🍳 3/8│ │🚿 1/5│         │
│  │      │ │      │         │
│  └──────┘ └──────┘         │
│  ┌──────┐ ┌──────┐         │
│  │🛋️ 0/4│ │🛏️ 2/6│         │
│  └──────┘ └──────┘         │
├─────────────────────────────┤
│  🏆 Gamification Row        │  ← NEW: horizontal scroll
│  [Streak🔥3] [Prize🎯45/50] [Challenge📋] │
├─────────────────────────────┤
│  AI Coaching Tip            │  ← KEPT: one bubble
├─────────────────────────────┤
│  Quick Links (2x2 grid)     │  ← CHANGED: grid instead of stack
│  ┌──────┐ ┌──────┐         │
│  │📝Blog│ │🖨️Print│         │
│  └──────┘ └──────┘         │
│  ┌──────┐ ┌──────┐         │
│  │🏠About│ │⚡Emergency│     │
│  └──────┘ └──────┘         │
├─────────────────────────────┤
│  Activity Feed (last 3)     │  ← KEPT but limited
└─────────────────────────────┘
```

### Key Changes:

1. **Quick Stats Bar** — 4 mini metric cards at top: tasks done, streak, points, rank
2. **Task List Limited to 5** — "Show all X tasks" button expands, collapsed by default
3. **House Map Promoted** — moves UP, right after tasks. This is the #2 most important section
4. **Gamification Horizontal Scroll** — streak, prize progress, challenge in one horizontal row instead of collapsible accordion
5. **Quick Links Grid** — 2x2 grid instead of vertical stack (blog, print, about, emergency)
6. **Remove stacked sections** — WeeklySummaryCards, RoomConditions, PartnerStatus, PlaylistCard → move to Settings or remove

### Sections REMOVED from Dashboard:
- `WeeklySummaryCards` → move to Weekly page
- `RoomConditions` → merged into HouseMap
- `PlaylistCard` → move to Settings
- `PartnerStatus` / `MembersStatus` → show in Quick Stats Bar as avatar
- `CoachingInsight` → keep only CoachingTips (AI-powered)

### Sections KEPT but Reorganized:
- `DashboardHeader` → kept as-is
- `PesachBanner` → kept
- `TodayOverview` → limited to 5 items
- `HouseMap` → promoted up
- `PrizeCard` → in gamification row
- `CoachingTips` → kept
- `ActivityFeed` → limited to 3 items
- `EmergencyToggle` → in quick links grid

---

## Navigation Enhancement

### Bottom Nav: Keep 6 Tabs but Improve
Current tabs are fine. Add **badge indicators**:
- Dashboard: red dot when tasks due today
- Shopping: count of unchecked items
- Weekly: "new" badge when plan outdated

### Feature Discovery
- Settings page: prominent "Setup Wizard" CTA at top
- First-time hint: pulsing dot on new features (one-time)

---

## Quick Stats Bar Component

New component: `src/components/dashboard/quick-stats-bar.tsx`

4 mini cards in a horizontal row:
1. **Tasks Done** — "3/8 היום" with circular progress
2. **Streak** — "🔥 3 ימים"
3. **Points** — "⭐ 45 נק'" with animated counter
4. **Rank** — "🥇 #1" or member avatar

---

## Gamification Row Component

New component: `src/components/dashboard/gamification-row.tsx`

Horizontal scrollable row with 3 cards:
1. **Streak Tracker** — mini version (days + milestone progress)
2. **Prize Progress** — next prize with mini progress bar
3. **Weekly Challenge** — current challenge status

Replaces the massive collapsible accordion that contained 7 components.

---

## Implementation Steps

### Phase 1: Dashboard Restructure (Critical)
1. Create `QuickStatsBar` component
2. Create `GamificationRow` component
3. Limit TodayOverview to 5 items with expand button
4. Move HouseMap up, remove redundant sections
5. Convert blog/links to 2x2 grid
6. Remove WeeklySummaryCards, RoomConditions, PlaylistCard from dashboard

### Phase 2: Polish
7. Add badge indicators to bottom nav tabs
8. Add "show all" expansion for task list
9. Smooth scroll-snap between sections

### Phase 3: Testing
10. Verify all features are discoverable within 2 scrolls
11. Test on mobile 375px viewport
12. Verify no regressions in existing functionality

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(app)/dashboard/page.tsx` | Major restructure — reorder sections, limit tasks, add QuickStatsBar |
| `src/components/dashboard/quick-stats-bar.tsx` | NEW: 4 metric cards row |
| `src/components/dashboard/gamification-row.tsx` | NEW: horizontal scroll with streak/prize/challenge |
| `src/components/dashboard/today-overview.tsx` | Add `maxItems` prop + "show more" button |
| `src/components/bottom-nav.tsx` | Add badge indicators |

---

## Acceptance Criteria

- [ ] Dashboard fits in 3 scrolls maximum (not 10+)
- [ ] HouseMap visible within first 2 scrolls
- [ ] PrizeCard visible within first 2 scrolls
- [ ] Task list shows max 5 tasks by default with expand
- [ ] Quick Stats Bar shows 4 metrics above fold
- [ ] Gamification is horizontal scroll, not collapsible accordion
- [ ] Blog/links are 2x2 grid, not vertical stack
- [ ] All removed sections accessible elsewhere (settings/weekly)
- [ ] Mobile 375px: no horizontal overflow
- [ ] Zero TS errors introduced
- [ ] All existing features still accessible (nothing deleted, only reorganized)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking demo mode | Use null-safe props, test without auth |
| Losing features | Nothing deleted — only moved/reorganized |
| Performance regression | Keep lazy-loading for heavy components |
| User confusion | Keep familiar patterns, just reorganize |
