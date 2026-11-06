import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCompletions } from "@/hooks/useCompletions";

const { rpc, from, trackEvent } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), trackEvent: vi.fn() }));
const client = { rpc, from };
vi.mock("@/components/SupabaseProvider", () => ({ useSupabase: () => client }));
vi.mock("@/lib/analytics", () => ({ trackEvent }));

const row = { id: "completion", task_id: "task", user_id: "user", completed_at: "2026-06-14T22:30:00Z", photo_url: null, notes: null };

describe("atomic task completions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) });
  });
  it("uses a single RPC and updates local state only after success", async () => {
    rpc.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: row, error: null }) });
    const { result } = renderHook(() => useCompletions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.markComplete({ taskId: "task", userId: "user", notes: "done" }); });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("transition_task_completion", expect.objectContaining({ p_action: "complete", p_task_id: "task", p_notes: "done" }));
    expect(result.current.completions).toEqual([row]);
    expect(trackEvent).toHaveBeenCalledOnce();
    await act(async () => { await result.current.undoComplete("task"); });
    expect(result.current.completions).toEqual([]);
  });
  it("does not report a completion or queue a false success on an RPC error", async () => {
    rpc.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST202", message: "function not found" } }) });
    const { result } = renderHook(() => useCompletions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let completed: unknown;
    await act(async () => { completed = await result.current.markComplete({ taskId: "task", userId: "user" }); });
    expect(completed).toBeNull();
    expect(result.current.completions).toEqual([]);
    expect(result.current.error).toBe("לא ניתן להשלים את המשימה");
    expect(from).toHaveBeenCalledTimes(1);
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
