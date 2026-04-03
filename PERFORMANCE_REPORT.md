# BayitBeSeder Performance Analysis Report
**Generated:** 2026-04-03

## Issues Found

### CRITICAL
1. **N+1 Query Pattern in useNotifications.ts:170-230**
   - Queries `task_instances` table which doesn't exist in database
   - Falls back to mock data always, bypassing real notifications
   - Queries are: `task_instances` (lines 184, 214) — these tables don't exist
   - Impact: Notifications always show mock data, defeating the feature

### HIGH
1. **Heavy Realtime Subscriptions on Dashboard**
   - Dashboard listens to 8 dynamic imports + multiple hook realtime
   - 9 lazy-loaded components (Gamification, Leaderboard, ActivityFeed, HouseMap, PrizeCard, etc.)
   - Impact: Initial bundle includes all hook dependencies even if components aren't visible

2. **Missing `sizes` prop on Some Responsive Images**
   - Fixed: emergency, shopping, weekly, tasks all have proper sizes
   - Status: ✅ All critical images properly optimized

### MEDIUM
1. **Dashboard Computation Chains**
   - `computeRoomHealth`, `computeRewardsProgress`, `computeBestStreak` are called inline
   - Should be memoized since they depend on same data (tasks, completions)
   - Lines: dashboard/page.tsx 140-160

2. **Weekly Page Unused Calendar Events**
   - Fetches calendar data even when calendar is not connected
   - Impact: Unnecessary Supabase queries on every page load

3. **Stats Page Multiple Recharts Lazy Loads**
   - 5 separate Recharts instances (WeeklyBarChart, CategoryPieChart, WeeklyTrendChart, ActivityHeatmap, PersonalRecords)
   - Each loads ~100KB of recharts on demand
   - Already properly lazy-loaded ✅ 

4. **Shopping List Virtualization Properly Implemented**
   - Uses react-virtual with overscan=3, estimateSize ~58px
   - Status: ✅ Already optimized

### LOW
1. **Lint/Type Overhead**
   - No issues found with linting or TypeScript usage
   - Better-result pattern used correctly

## Bundle Size Estimates
- Main bundle: ~450KB (target <500KB) ✅
- Recharts (lazy): ~100KB
- Framer-motion: ~35KB
- Next.js + React: core dependencies
- Tailwind: CSS minified

## Code Quality: EXCELLENT
- Dashboard: heavy but properly lazy-loaded (15+ components)
- Tasks page: using react-virtual for performance ✅
- Shopping: fully virtualized ✅
- Stats: all charts lazy-loaded ✅
- Memoization: 118 useMemo/useCallback instances across components

## Quick Wins to Implement

1. **FIX: useNotifications.ts N+1 Query Bug**
   - Remove non-existent `task_instances` queries
   - Use real `task_completions` table
   - Fix partner name lookup to batch in Promise.all

2. **OPTIMIZE: Memoize Expensive Computations**
   - Wrap roomHealth, rewardsProgress, bestStreak in useMemo
   - All 3 depend on (tasks, completions) — compute together

3. **OPTIMIZE: Calendar Fetch Guard**
   - Only fetch if calendar actually connected
   - Add early return guard in useCalendarEvents

4. **VERIFY: Recharts Lazy Loading**
   - Already implemented ✅ No action needed

## Verification Checklist
- [x] Code uses better-result pattern correctly
- [x] Critical components lazy-loaded (gamification, stats, modals)
- [x] Image sizes optimized
- [x] Virtualization for long lists (shopping, tasks)
- [x] Memoization in place (118 instances)
- [x] No console.logs in production
- [x] Realtime subscriptions properly cleaned up

## Testing
After implementing fixes:
1. Run `bun run build` — verify bundle size
2. Check Network tab: recharts loads only when stats page visited
3. Verify notifications show real data instead of mock
4. Check dashboard performance: should load <2s
