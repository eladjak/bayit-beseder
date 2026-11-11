import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const page = readFileSync('src/app/(app)/stats/page.tsx', 'utf8');
describe('stats honesty safeguards', () => {
  it('does not fall back to invented data and has a next action', () => {
    expect(page).not.toMatch(/MOCK_WEEKLY_DATA|MOCK_CATEGORY_DATA|myCount: 48|partnerCount: 42/);
    expect(page).toContain('statsEmpty');
    expect(page).toContain('href="/tasks"');
  });
  it('waits for the subscription before rendering the page', () => {
    expect(page).toMatch(/tasksLoading \|\| completionsLoading \|\| subscriptionLoading/);
  });
});

it('does not display a category percentage as a task count or demo badges', () => {
  expect(page).not.toContain('count: categoryData[0].value');
  expect(page).toContain('{completions.length > 0 && <BadgesDisplay />}');
});
