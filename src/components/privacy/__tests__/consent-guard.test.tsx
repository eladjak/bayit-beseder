/**
 * ConsentGuard: the app is shown only for a user whose consent the server
 * confirmed, an answer never outlives the user it was for, "could not check" is
 * not "please consent", and a stalled check ends in a retry, not a spinner.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";

let currentUser: { id: string; user_metadata?: Record<string, unknown> } | null;
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: currentUser, loading: false }) }));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ t: (k: string) => k, locale: "he" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/supabase", () => ({ createClient: () => ({ auth: { signOut: async () => ({}) } }) }));
vi.mock("../ConsentGate", () => ({
  ConsentGate: ({ onAccepted }: { onAccepted: () => void }) => (
    <div>
      GATE <button onClick={onAccepted}>accept</button>
    </div>
  ),
}));

import { ConsentGuard } from "../ConsentGuard";

interface Pending {
  userId: string | null;
  resolve: (r: Response) => void;
  signal: AbortSignal | undefined;
}
let pending: Pending[];
let posts: number;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

function installFetch() {
  pending = [];
  posts = 0;
  vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      posts++;
      return Promise.resolve(json(200, { accepted: true }));
    }
    return new Promise<Response>((resolve, reject) => {
      const entry: Pending = { userId: currentUser?.id ?? null, resolve, signal: init?.signal as AbortSignal | undefined };
      entry.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      pending.push(entry);
    });
  });
}

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const answer = async (i: number, status: number, body: unknown) => {
  await act(async () => { pending[i].resolve(json(status, body)); });
  await flush();
};

function App() {
  return <ConsentGuard><div>THE-APP</div></ConsentGuard>;
}

beforeEach(() => {
  installFetch();
  currentUser = { id: "user-a" };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ConsentGuard", () => {
  it("shows the app only after the server says accepted", async () => {
    render(<App />);
    expect(screen.queryByText("THE-APP")).toBeNull();
    expect(screen.getByText("privacy.gate.checking")).toBeTruthy();
    await answer(0, 200, { accepted: true });
    expect(screen.getByText("THE-APP")).toBeTruthy();
  });

  it("shows the form when the server checked and there is no record", async () => {
    render(<App />);
    await answer(0, 200, { accepted: false });
    expect(screen.getByText(/GATE/)).toBeTruthy();
    expect(screen.queryByText("THE-APP")).toBeNull();
  });

  it("USER CHANGE: user B never inherits user A's accepted state, not even for one render (red before the fix)", async () => {
    const { rerender } = render(<App />);
    await answer(0, 200, { accepted: true });
    expect(screen.getByText("THE-APP")).toBeTruthy();

    currentUser = { id: "user-b" };
    rerender(<App />); // B's check is now in flight and has not answered
    expect(screen.queryByText("THE-APP")).toBeNull();
    expect(screen.getByText("privacy.gate.checking")).toBeTruthy();

    await answer(1, 200, { accepted: false }); // B has not consented
    expect(screen.queryByText("THE-APP")).toBeNull();
    expect(screen.getByText(/GATE/)).toBeTruthy();
  });

  it("STALE RESPONSE: A's late answer cannot override B's (the request for A is also aborted)", async () => {
    const { rerender } = render(<App />);
    currentUser = { id: "user-b" };
    rerender(<App />);
    expect(pending[0].signal?.aborted).toBe(true);
    await answer(1, 200, { accepted: false });
    expect(screen.getByText(/GATE/)).toBeTruthy();
    // A's answer arrives late (as a server would, ignoring the abort): must change nothing.
    await act(async () => { pending[0].resolve(json(200, { accepted: true })); });
    await flush();
    expect(screen.queryByText("THE-APP")).toBeNull();
    expect(screen.getByText(/GATE/)).toBeTruthy();
  });

  it("signing out drops the answer: back to checking, never the app", async () => {
    const { rerender } = render(<App />);
    await answer(0, 200, { accepted: true });
    currentUser = null;
    rerender(<App />);
    expect(screen.queryByText("THE-APP")).toBeNull();
  });

  it("OUTAGE (503): a retry screen, NOT the consent form and NOT the app", async () => {
    render(<App />);
    await answer(0, 503, { error: "consent_unavailable" });
    expect(screen.getByText("privacy.gate.checkError")).toBeTruthy();
    expect(screen.queryByText(/GATE/)).toBeNull();
    expect(screen.queryByText("THE-APP")).toBeNull();
    // ...with a way out
    expect(screen.getByText("privacy.gate.signOut")).toBeTruthy();
  });

  it("retry asks again and then lets a previously consenting person in", async () => {
    render(<App />);
    await answer(0, 503, {});
    fireEvent.click(screen.getByText("privacy.gate.retry"));
    await flush();
    expect(pending.length).toBe(2);
    await answer(1, 200, { accepted: true });
    expect(screen.getByText("THE-APP")).toBeTruthy();
  });

  it("a network failure is also 'could not check'", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("fetch failed")));
    render(<App />);
    await flush();
    expect(screen.getByText("privacy.gate.checkError")).toBeTruthy();
    expect(screen.queryByText(/GATE/)).toBeNull();
  });

  it("TIMEOUT: a check that never answers ends in the retry screen instead of a spinner forever", async () => {
    vi.useFakeTimers();
    render(<App />);
    expect(screen.getByText("privacy.gate.checking")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(8100); });
    expect(screen.getByText("privacy.gate.checkError")).toBeTruthy();
    expect(pending[0].signal?.aborted).toBe(true);
  });

  it("user_metadata is never trusted: a metadata 'consent' note creates no record and shows the form", async () => {
    currentUser = { id: "user-a", user_metadata: { privacy_consent: { version: "2026-11-10", age: true, privacy: true, terms: true } } };
    render(<App />);
    await answer(0, 200, { accepted: false });
    expect(posts).toBe(0);
    expect(screen.getByText(/GATE/)).toBeTruthy();
    expect(screen.queryByText("THE-APP")).toBeNull();
  });

  it("an unexpected answer body fails closed", async () => {
    render(<App />);
    await answer(0, 200, { hello: "world" });
    expect(screen.queryByText("THE-APP")).toBeNull();
    expect(screen.getByText("privacy.gate.checkError")).toBeTruthy();
  });
});
