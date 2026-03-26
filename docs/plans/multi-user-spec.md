# Multi-User Households — Technical Spec

## Current State
- DB supports: `households` table + `household_members` table with roles (owner/member)
- App assumes: 2 users max (partner_id on profiles)
- Weekly generator: splits tasks between 2 members only
- Stats: compares "me vs partner"

## Goal
Support 2-6 household members (couples, kids, roommates) while keeping the app simple for couples.

## Phase 1: Foundation (No UI Change)
- [ ] Migrate from `partner_id` to `household_members` query for member list
- [ ] Create `useHouseholdMembers()` hook that returns all members
- [ ] Update weekly generator to support N members (already partially done)
- [ ] Update stats to show per-member breakdown

## Phase 2: Member Management UI
- [ ] Settings: "Members" section showing all household members
- [ ] Role display (owner badge)
- [ ] Remove member (owner only)
- [ ] Invite link still works (adds as "member" role)

## Phase 3: Task Assignment
- [ ] Task assignment dropdown shows all members (not just "me" and "partner")
- [ ] Weekly wizard distributes across N members
- [ ] Dashboard shows member avatars on assigned tasks

## Phase 4: Kids Mode (Optional)
- [ ] "Kid" role with simplified task view
- [ ] Parental approval for task completion
- [ ] Age-appropriate task suggestions

## Migration Strategy
- Keep backward compatible with existing 2-user households
- partner_id stays as a shortcut, household_members is the source of truth
- Existing data doesn't need migration (just add queries)

## Files to Change
- src/hooks/usePartner.ts → src/hooks/useHouseholdMembers.ts
- src/lib/weekly-generator.ts (already supports N members)
- src/app/(app)/dashboard/page.tsx (member list rendering)
- src/components/dashboard/partner-status.tsx → member-status.tsx
- src/app/(app)/settings/page.tsx (member management section)
- src/components/weekly/weekly-generator-modal.tsx (N-member assignment)
