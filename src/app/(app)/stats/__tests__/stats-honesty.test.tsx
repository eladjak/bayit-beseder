/* eslint-disable @typescript-eslint/no-explicit-any -- lightweight component test doubles */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import StatsPage from '../page';
import { useAdvancedStats } from '@/hooks/useAdvancedStats';
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
const state = vi.hoisted(() => ({ tasks: [] as any[], loading: false }));
vi.mock('next/dynamic', () => ({ default: () => () => <div>dynamic-content</div> }));
vi.mock('next/link', () => ({ default: ({children, ...props}: any) => <a {...props}>{children}</a> }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useCopy', () => ({ useCopy: () => ({ c: (key: string) => key }) }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: state.tasks, loading: false }) }));
vi.mock('@/hooks/useCompletions', () => ({ useCompletions: () => ({ completions: [], loading: false }) }));
vi.mock('@/hooks/useCategories', () => ({ useCategories: () => ({ categoryMap: {} }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { id: 'u1', household_id: 'h1' } }) }));
vi.mock('@/hooks/usePartner', () => ({ usePartner: () => ({ partner: null }) }));
vi.mock('@/hooks/useHouseholdMembers', () => ({ useHouseholdMembers: () => ({ members: [] }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ loading: state.loading, canUse: () => !state.loading }) }));
vi.mock('@/components/upgrade-prompt', () => ({ UpgradePrompt: () => <div>upgrade-prompt</div> }));
afterEach(cleanup); beforeEach(() => { state.tasks = []; state.loading = false; });
it('renders a useful empty state when tasks exist but no completions', () => { state.tasks = [{id: 't1', status: 'pending'}]; render(<StatsPage />); expect(screen.getByText('statsEmpty')).toBeTruthy(); expect(screen.getByText('statsAction').closest('a')?.getAttribute('href')).toBe('/tasks'); expect(screen.queryByText('stats.advancedStats')).toBeNull(); });
it('shows a skeleton and no upgrade prompt while subscription loads', () => { state.loading = true; render(<StatsPage />); expect(screen.queryByText('upgrade-prompt')).toBeNull(); expect(document.querySelector('.animate-pulse')).toBeTruthy(); });

it('advanced statistics return empty collections for a household without completions', () => {
  function Probe() {
    const stats = useAdvancedStats({ completions: [], tasks: [{ id: 't1' } as any], categoryIdToKey: {}, today: '2026-11-11' });
    return <div>trend:{stats.weeklyTrend.length} categories:{stats.categoryDistribution.length}</div>;
  }
  render(<Probe />);
  expect(screen.getByText('trend:0 categories:0')).toBeTruthy();
});
