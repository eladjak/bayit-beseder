import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShoppingAdd } from '../ShoppingAdd';

beforeEach(cleanup);
describe('shopping add', () => {
 it('offers suggestions after two letters and adds the keyboard selection', async () => {
  const add = vi.fn().mockResolvedValue({ok: true});
  render(<ShoppingAdd locale="he" onAdd={add} />);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, {target:{value:'חל'}});
  expect(screen.getByRole('listbox')).toBeTruthy();
  fireEvent.keyDown(input, {key:'ArrowDown'});
  expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
  fireEvent.keyDown(input, {key:'Enter'});
  await waitFor(() => expect(add).toHaveBeenCalledWith('חלב'));
 });
 it('finds Hebrew suggestions with niqqud and a small typo', () => {
  render(<ShoppingAdd locale="he" onAdd={vi.fn()} />); const input = screen.getByRole('combobox');
  fireEvent.change(input, {target:{value:'חָלב'}}); expect(screen.getAllByRole('option').some(option => option.textContent === 'חלב')).toBe(true);
  fireEvent.change(input, {target:{value:'חלפ'}}); expect(screen.getAllByRole('option').some(option => option.textContent === 'חלב')).toBe(true);
 });
 it('adds an arbitrary item on Enter', async () => {
  const add = vi.fn().mockResolvedValue({ok:true}); render(<ShoppingAdd locale="he" onAdd={add} />);
  fireEvent.change(screen.getByRole('combobox'), {target:{value:'פריט מיוחד'}}); fireEvent.submit(screen.getByRole('combobox').closest('form')!);
  await waitFor(() => expect(add).toHaveBeenCalledWith('פריט מיוחד'));
 });
});

const mocks = vi.hoisted(() => ({ remove: vi.fn(), toast: vi.fn() }));
vi.mock('@/hooks/useShoppingList', () => ({ useShoppingList: () => ({ items: [{id:'1',title:'חלב',category:'שונות',checked:false,added_by:'unknown'}, {id:'2',title:'לחם',category:'שונות',checked:true,added_by:'unknown'}], loading:false, storage:'server', deviceItems:[], retrying:false, retry:vi.fn(), addItem:vi.fn(), toggleItem:vi.fn(), removeItem:mocks.remove, editItem:vi.fn() }) }));
vi.mock('@/hooks/useShoppingCategories', () => ({ useShoppingCategories: () => ({ categories: [] }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile:{household_id:'h'}, loading:false }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ locale:'he' }) }));
vi.mock('@/hooks/useCopy', () => ({ useCopy: (fragment: {he:Record<string,string>}) => ({c:(key:string) => fragment.he[key]}) }));
vi.mock('sonner', () => ({toast:mocks.toast}));
import ShoppingV2 from '../ShoppingV2';
describe('shopping actions', () => {
 beforeEach(() => { vi.clearAllMocks(); });
 it('clears bought after five seconds and undo cancels', () => {
  vi.useFakeTimers(); const view = render(<ShoppingV2 />); fireEvent.click(screen.getByRole('button',{name:/נקנו/})); fireEvent.click(screen.getByRole('button',{name:'ניקוי הפריטים שנקנו'})); expect(mocks.remove).not.toHaveBeenCalled(); mocks.toast.mock.calls.at(-1)![1].action.onClick(); vi.advanceTimersByTime(5000); expect(mocks.remove).not.toHaveBeenCalled(); view.unmount(); vi.useRealTimers();
 });
 it('sends clear only after five seconds', () => {
  vi.useFakeTimers(); const view = render(<ShoppingV2 />); fireEvent.click(screen.getByRole('button',{name:/נקנו/})); fireEvent.click(screen.getByRole('button',{name:'ניקוי הפריטים שנקנו'})); vi.advanceTimersByTime(4999); expect(mocks.remove).not.toHaveBeenCalled(); vi.advanceTimersByTime(1); expect(mocks.remove).toHaveBeenCalledWith('2'); view.unmount(); vi.useRealTimers();
 });
 it('flushes clear on pagehide', () => {
  vi.useFakeTimers(); const view = render(<ShoppingV2 />); fireEvent.click(screen.getByRole('button',{name:/נקנו/})); fireEvent.click(screen.getByRole('button',{name:'ניקוי הפריטים שנקנו'})); fireEvent(window,new Event('pagehide')); expect(mocks.remove).toHaveBeenCalledWith('2'); view.unmount(); vi.useRealTimers();
 });
 it('copies only open items', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator,'clipboard',{value:{writeText}, configurable:true}); render(<ShoppingV2 />); fireEvent.click(screen.getByRole('button',{name:'העתקת הרשימה'})); await waitFor(() => expect(writeText).toHaveBeenCalledWith('חלב'));
 });
});
