// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { PrintTasks } from '@/components/print-tasks';

const state = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => state.enabled }));
const props = { tasks: [{ id: '1', title: 'Wash', category_id: 'r', assigned_to: 'm', points: 1, status: 'pending', due_date: '2026-11-11' }], categories: [{ id: 'r', name: 'Kitchen', icon: '' }], members: [{ id: 'm', display_name: 'A' }], houseName: 'Home' };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('v2 print sheet', () => {
  it('keeps the new print action behind the switch and invokes print', () => {
    state.enabled = false; const view = render(<PrintTasks {...props} />);
    expect(screen.queryByRole('button', { name: 'הדפסה' })).toBeNull();
    view.unmount(); state.enabled = true;
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<PrintTasks {...props} />); fireEvent.click(screen.getByRole('button', { name: 'הדפסה' }));
    expect(print).toHaveBeenCalledOnce();
  });
  it('shows the household, date range, room, assignee and task', () => {
    state.enabled = true; render(<PrintTasks {...props} />);
    for (const text of ['Home', 'Kitchen', 'Wash', 'טווח תאריכים', 'הודפס בתאריך']) expect(screen.getByText(text, { exact: false })).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
  });
  it('scopes print rules and avoids splitting rows', () => {
    const root = postcss.parse(readFileSync('src/styles/print-v2.css', 'utf8'));
    const rules: {selector: string; prop: string; value: string}[] = [];
    root.walkRules(rule => rule.walkDecls(decl => { rules.push({ selector: rule.selector, prop: decl.prop, value: decl.value }); }));
    expect(rules.some(r => r.selector.includes('html[data-ui="v2"]') && r.selector.includes('nav') && r.prop === 'display' && r.value === 'none')).toBe(true);
    expect(rules.some(r => r.selector.includes('html[data-ui="v2"]') && r.selector.includes('print-v2-row') && r.prop === 'break-inside' && r.value === 'avoid')).toBe(true);
  });
});
