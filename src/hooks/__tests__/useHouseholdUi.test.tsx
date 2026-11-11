import React from "react";
import { act, render, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: null as { id: string } | null, loading: false, row: null as { household_id: string } | null, queries: 0 }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user, loading: state.loading }) }));
vi.mock("@/lib/supabase", () => ({ isSupabaseConfigured: () => true, createClient: () => ({ from: () => ({ select: () => ({ limit: async () => { state.queries++; return { data: state.row ? [state.row] : [], error: null }; } }) }) }) }));
import { useNewUi } from "../useNewUi";
function Consumer() { return <span>{String(useNewUi())}</span>; }
beforeEach(() => { state.user = null; state.loading = false; state.row = null; state.queries = 0; localStorage.clear(); delete document.documentElement.dataset.ui; });
afterEach(() => cleanup());
it("enables an allowed household once, then clears on sign out", async () => {
  state.user = { id: "allowed" }; state.row = { household_id: "a" };
  const view = render(<><Consumer /><Consumer /></>);
  await waitFor(() => expect(document.documentElement.dataset.ui).toBe("v2"));
  expect(state.queries).toBe(1);
  state.user = null; view.rerender(<><Consumer /><Consumer /></>);
  await waitFor(() => expect(document.documentElement.dataset.ui).toBeUndefined());
});
it("keeps an unlisted household unchanged with one query", async () => {
  state.user = { id: "unlisted" }; const view = render(<Consumer />);
  await waitFor(() => expect(state.queries).toBe(1));
  await act(async () => {}); expect(document.documentElement.dataset.ui).toBeUndefined();
  view.rerender(<Consumer />); expect(state.queries).toBe(1);
});

it("restores the base flag when the last consumer unmounts", async () => {
  state.user = { id: "unmount-user" }; state.row = { household_id: "a" };
  const view = render(<Consumer />);
  await waitFor(() => expect(document.documentElement.dataset.ui).toBe("v2"));
  view.unmount();
  expect(document.documentElement.dataset.ui).toBeUndefined();
});
