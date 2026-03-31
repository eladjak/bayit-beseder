# Competitor Features Integration Plan
## BayitBeSeder — Inspired by pesach-app.vercel.app

**Date:** 2026-03-31
**Status:** DRAFT
**Scope:** 8 features, ~15 new/modified files
**Priority:** Ship before Pesach (April 2, 2026) — 2 days

---

## Requirements Summary

Integrate best ideas from pesach-app into BayitBeSeder, adapted to our architecture and elevated in quality. Not a copy — a level-up.

---

## Feature List (Prioritized)

### F1: Guided Room-by-Room Task Setup Wizard
**What:** Multi-step wizard that replaces/enhances the conversational onboarding. User picks rooms, gets auto-populated task templates per room with difficulty levels, can edit/remove/add, then all tasks are created in Supabase.
**Where:** New component `src/components/setup-wizard/` (4-5 files)
**Integrates with:**
- `src/lib/seed-data.ts` (existing 60+ task templates with difficulty 1-3)
- `src/hooks/useTasks.ts` (createTask)
- `src/hooks/useTaskCategories.ts` (8 default categories = rooms)
- Conversational onboarding step 5 (`StepGenerating`) — replace with wizard
**Steps:**
1. Choose cleaning level (basic/thorough/deep) — controls which tasks appear
2. Pick rooms from grid (existing 8 categories + custom) — each shows task count
3. Per-room task list with difficulty badges (easy/medium/hard) — toggle on/off, add custom
4. Review all rooms + tasks summary
5. Create tasks in Supabase + celebration

**Acceptance Criteria:**
- [ ] Wizard has 5 steps with animated progress bar
- [ ] Cleaning level filters tasks: basic=daily only, thorough=daily+weekly, deep=all
- [ ] Room grid shows 8 default rooms with icons + task count per level
- [ ] Per-room view shows template tasks with difficulty badge (green/orange/red)
- [ ] User can toggle tasks on/off, edit names, add custom tasks
- [ ] Review step shows all selected rooms + task counts
- [ ] "Create" button inserts all tasks to Supabase with correct category_id, points, difficulty
- [ ] Works in both Hebrew and English (i18n keys)
- [ ] Accessible from: onboarding, settings page, Pesach mode activation

---

### F2: Task Difficulty & Points System Enhancement
**What:** Add visible difficulty badges (easy=5pts, medium=10pts, hard=20pts) to task cards throughout the app. Currently difficulty exists in seed-data but isn't visible in task UI.
**Where:**
- `src/components/dashboard/today-overview.tsx` — add difficulty badge to task cards
- `src/app/(app)/tasks/page.tsx` — add difficulty badge + points display
- `src/lib/seed-data.ts` — already has `difficulty: 1|2|3`
**Acceptance Criteria:**
- [ ] Task cards show colored difficulty badge (green/amber/red)
- [ ] Points visible on each task (5/10/20)
- [ ] Leaderboard reflects real point totals from completions
- [ ] Filter tasks by difficulty on tasks page

---

### F3: Self-Service Task Claiming ("I'll Take It")
**What:** Tasks start as "open" (unassigned). Family members claim tasks themselves via "I'll take it" button. Replaces current assign-by-admin model.
**Where:**
- `src/app/(app)/tasks/page.tsx` — add claim button for unassigned tasks
- `src/hooks/useTasks.ts` — add `claimTask(taskId)` function
**Acceptance Criteria:**
- [ ] Unassigned tasks show "I'll take it" button with animation
- [ ] Clicking assigns task to current user
- [ ] Other household members see who claimed what in real-time (Supabase Realtime)
- [ ] Task card shows claimer's avatar after claim

---

### F4: House Map — Room Progress Cards
**What:** Visual grid of rooms on dashboard, each showing icon + name + progress (completed/total). Clicking navigates to room's tasks.
**Where:** New component `src/components/dashboard/house-map.tsx`
**Acceptance Criteria:**
- [ ] Grid of room cards with category icon, name, progress bar
- [ ] Progress = completed tasks / total tasks per category
- [ ] Click navigates to tasks page filtered by that category
- [ ] Empty rooms (0 tasks) show "add tasks" CTA
- [ ] Animated progress bars (framer-motion)

---

### F5: Print Task Checklist
**What:** Generate a beautiful A4 RTL Hebrew print layout of all tasks grouped by room, with checkboxes, difficulty indicators, and assigned member.
**Where:**
- New component `src/components/print-tasks.tsx`
- New `src/app/(app)/tasks/print/page.tsx` (print-optimized route)
**Acceptance Criteria:**
- [ ] A4 portrait layout, RTL, Heebo font
- [ ] Tasks grouped by room with room header + icon
- [ ] Each task: checkbox + name + difficulty badge + assigned member
- [ ] Header: house name + date + "בית בסדר" branding
- [ ] Footer: room count + task count summary
- [ ] Print button in tasks page + settings + weekly page
- [ ] @media print CSS for clean output
- [ ] Works on Chrome, Safari, mobile (share as PDF)

---

### F6: Competition Scoreboard Enhancement
**What:** Enhanced leaderboard with daily/cumulative tabs, animated point counters, crown for leader, and family avatars.
**Where:** Enhance `src/components/gamification/leaderboard.tsx`
**Acceptance Criteria:**
- [ ] Daily / Weekly / All-time tabs
- [ ] Animated point counter on change
- [ ] Crown/trophy icon for current leader
- [ ] Member avatars or emoji
- [ ] Points breakdown: easy tasks, medium tasks, hard tasks

---

### F7: Prize System (Basic)
**What:** Household admin can define prizes for point milestones. Simple localStorage-based for now, Supabase later.
**Where:** New `src/components/prizes/`
**Acceptance Criteria:**
- [ ] Admin can add prizes with name + point threshold + emoji
- [ ] Dashboard shows next prize with progress bar
- [ ] Celebration animation when prize unlocked
- [ ] Default prizes: 50pts="ice cream", 100pts="movie night", 200pts="restaurant"
- [ ] i18n support

---

### F8: Pesach Mode Wizard Integration
**What:** Replace the current 3-step Pesach activation modal with the new room wizard (F1) pre-loaded with Pesach-specific tasks from `src/lib/seasonal/templates/pesach.ts`.
**Where:**
- `src/components/seasonal/pesach-activation-modal.tsx` — replace content
- `src/lib/seasonal/templates/pesach.ts` — restructure to room-based format
**Acceptance Criteria:**
- [ ] Pesach wizard uses same room wizard UI as F1
- [ ] Pre-selected rooms: kitchen, bedroom, bathroom, living, general
- [ ] Tasks pre-populated from Pesach template (37 tasks)
- [ ] Cleaning level maps to Pesach phases (basic=phase1, thorough=phase1+2, deep=all)
- [ ] Countdown to Pesach shown in wizard header
- [ ] Shopping items still added (25 items)

---

## Implementation Order

```
Phase 1 (Critical — Day 1):
  F1: Room Wizard (core component, used by F8)
  F2: Difficulty Badges (small, high visibility)
  F3: Task Claiming (competition enabler)
  F8: Pesach Wizard (timely — Pesach in 2 days)

Phase 2 (Day 1-2):
  F4: House Map (dashboard enhancement)
  F5: Print Tasks (offline value)
  F6: Scoreboard Enhancement

Phase 3 (Post-Pesach):
  F7: Prize System (needs design iteration)
```

---

## Files to Create/Modify

### New Files:
1. `src/components/setup-wizard/setup-wizard.tsx` — main wizard container
2. `src/components/setup-wizard/step-cleaning-level.tsx` — level picker
3. `src/components/setup-wizard/step-room-picker.tsx` — room grid
4. `src/components/setup-wizard/step-room-tasks.tsx` — per-room task editor
5. `src/components/setup-wizard/step-review.tsx` — summary before creation
6. `src/lib/room-task-templates.ts` — room→tasks mapping with difficulty
7. `src/components/dashboard/house-map.tsx` — room progress cards
8. `src/components/print-tasks.tsx` — print layout component
9. `src/app/(app)/tasks/print/page.tsx` — print route
10. `src/components/prizes/prize-card.tsx` — prize display
11. `src/components/prizes/prize-manager.tsx` — admin prize CRUD

### Modified Files:
1. `src/components/dashboard/today-overview.tsx` — difficulty badges
2. `src/app/(app)/tasks/page.tsx` — claim button, difficulty filter, print button
3. `src/app/(app)/dashboard/page.tsx` — house map section, prizes section
4. `src/hooks/useTasks.ts` — claimTask()
5. `src/components/gamification/leaderboard.tsx` — tabs, animations
6. `src/components/seasonal/pesach-activation-modal.tsx` — use wizard
7. `src/lib/i18n/dictionaries/he.json` — ~80 new keys
8. `src/lib/i18n/dictionaries/en.json` — ~80 new keys

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep before Pesach | Miss deadline | Phase 1 only before Pesach; Phase 2-3 after |
| DB schema changes needed | Migration required | Use existing schema — difficulty/points already in tasks table |
| Wizard too complex on mobile | UX degradation | Mobile-first design, test on 375px viewport |
| i18n missing keys | Broken UI | Add all keys before component code |
| Print CSS breaks layout | Bad output | Test @media print separately, use dedicated route |

---

## Verification Steps

1. TypeScript: `./node_modules/.bin/tsc --noEmit` passes (no new errors)
2. Wizard: complete all 5 steps → tasks appear in Supabase
3. Difficulty badges visible on dashboard + tasks page
4. Claim task → shows in leaderboard with correct points
5. Print → A4 RTL layout renders correctly
6. Pesach wizard → 37 tasks created with correct categories
7. House map → progress bars reflect real completion data
8. All new text has he+en translations
