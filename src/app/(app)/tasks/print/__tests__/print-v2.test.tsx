// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { PrintTasks } from '@/components/print-tasks';

const state = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/hooks/useNewUi', () => ({ useNewUi: () => state.enabled }));
const props = { tasks: [{ id: '1', title: 'Wash', category_id: 'r', assigned_to: 'm', points: 1, status: 'pending', due_date: '2026-11-11' }], categories: [{ id: 'r', name: 'Kitchen', icon: '' }], members: [{ id: 'm', display_name: 'A' }], houseName: 'Home' };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
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
    for (const text of ['Home', 'Wash', 'טווח תאריכים', 'הודפס בתאריך']) expect(screen.getByText(text, { exact: false })).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
  });
  it('labels every task with its room and describes undated tasks', () => {
    state.enabled = true;
    render(<PrintTasks {...props} tasks={[...props.tasks, {...props.tasks[0], id: '2', title: 'Undated', due_date: null}]} />);
    for (const title of ['Wash', 'Undated']) expect(screen.getByText(title).closest('.print-v2-row')?.textContent).toContain('Kitchen');
    expect(screen.getByText('ללא תאריך', { exact: false })).toBeTruthy();
  });
  it('shows a single date for a single-day range and uses Israel calendar day', () => {
    state.enabled = true; vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-10T23:30:00Z'));
    render(<PrintTasks {...props} />);
    expect(screen.getByText('טווח תאריכים: 11.11.2026')).toBeTruthy();
    expect(screen.getByText('הודפס בתאריך: 11.11.2026')).toBeTruthy();
    vi.useRealTimers();
  });
  it('keeps required paper rules in print media and sizes the checkbox', () => {
    const root = postcss.parse(readFileSync('src/styles/print-v2.css', 'utf8'));
    const matching = (selector: string, prop: string, value: string) => {
      const found: { print: boolean; scoped: boolean }[] = [];
      root.walkRules(rule => rule.walkDecls(prop, decl => {
        if (rule.selector.includes(selector) && decl.value === value) {
          let parent: { type: string; name?: string; params?: string; parent?: typeof parent } | undefined = rule.parent; let print = false;
          while (parent) { if (parent.type === 'atrule' && parent.name === 'media' && parent.params === 'print') print = true; parent = parent.parent; }
          found.push({ print, scoped: rule.selector.includes('html[data-ui="v2"]') });
        }
      }));
      return found;
    };
    for (const [selector, prop, value] of [['nav[aria-label]', 'display', 'none'], ['button', 'display', 'none'], ['.print-v2-row', 'break-inside', 'avoid'], ['.print-v2 *', 'font-size', '11pt'], ['.print-v2 *', 'background', 'transparent'], ['.print-v2 *', 'color', 'black']]) {
      const rules = matching(selector, prop, value); expect(rules.length).toBeGreaterThan(0); expect(rules.every(r => r.print && r.scoped)).toBe(true);
    }
    for (const prop of ['width', 'height']) expect(matching('.print-v2-check', prop, '6mm').length).toBeGreaterThan(0);
    const page = root.nodes.find(n => n.type === 'atrule' && n.name === 'page' && n.params === 'print-v2'); expect(page).toBeTruthy();
  });
});
