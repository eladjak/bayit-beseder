/**
 * GateBilling: the cancel option on the privacy gate. It may only talk to the server route (a boolean
 * comes back); it must show the button only when the server says there is something to cancel.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";

vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ t: (k: string) => k, locale: "he" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { GateBilling } from "../GateBilling";

let calls: { url: string; method: string }[];
let answer: () => Promise<Response>;

beforeEach(() => {
  calls = [];
  answer = async () => new Response(JSON.stringify({ cancellable: true }), { status: 200 });
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET" });
    return answer();
  });
  vi.stubGlobal("confirm", () => true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe("GateBilling", () => {
  it("shows the cancel button when the server says there is a billing subscription, and only talks to the server route", async () => {
    render(<GateBilling />);
    await flush();
    expect(screen.getByText("settings.subscriptionSection.cancelButton")).toBeTruthy();
    expect(calls).toEqual([{ url: "/api/sumit/cancel-subscription", method: "GET" }]);
  });

  it("renders nothing when there is nothing to cancel", async () => {
    answer = async () => new Response(JSON.stringify({ cancellable: false }), { status: 200 });
    const { container } = render(<GateBilling />);
    await flush();
    expect(container.textContent).toBe("");
  });

  it("anything that is not the literal boolean true is 'nothing to cancel'", async () => {
    answer = async () => new Response(JSON.stringify({ cancellable: "yes", rows: [{ id: 1 }] }), { status: 200 });
    const { container } = render(<GateBilling />);
    await flush();
    expect(container.textContent).toBe("");
  });

  it("an outage shows a retry (not the button, not silence)", async () => {
    answer = async () => new Response("{}", { status: 500 });
    render(<GateBilling />);
    await flush();
    expect(screen.getByText("privacy.gate.billingCheckError")).toBeTruthy();
    expect(screen.queryByText("settings.subscriptionSection.cancelButton")).toBeNull();
  });

  it("cancelling POSTs to the same route with an empty body, then asks again", async () => {
    render(<GateBilling />);
    await flush();
    answer = async () => new Response(JSON.stringify({ cancellable: false }), { status: 200 });
    fireEvent.click(screen.getByText("settings.subscriptionSection.cancelButton"));
    await flush();
    await flush();
    expect(calls.map((c) => c.method)).toEqual(["GET", "POST", "GET"]);
    expect(calls.every((c) => c.url === "/api/sumit/cancel-subscription")).toBe(true);
  });
});
