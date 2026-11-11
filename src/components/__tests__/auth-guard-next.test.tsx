import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ path: "/shopping", search: "x=1", replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }), usePathname: () => state.path }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
import { AuthGuard } from "../AuthGuard";
afterEach(() => { cleanup(); vi.unstubAllEnvs(); state.replace.mockClear(); });
describe("AuthGuard return path", () => {
  it.each([["/shopping", "x=1", "/login?next=%2Fshopping%3Fx%3D1"], ["/dashboard", "", "/login"], ["/dashboard", "x=1", "/login"]])("redirects %s", async (path, search, expected) => {
    vi.stubEnv("NEXT_PUBLIC_NEW_UI", "true"); state.path = path; window.history.replaceState({}, "", `${path}${search ? `?${search}` : ""}`);
    render(<AuthGuard><span>content</span></AuthGuard>);
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith(expected));
  });
  it("keeps bare login when switched off", async () => {
    vi.stubEnv("NEXT_PUBLIC_NEW_UI", "false"); state.path = "/shopping"; window.history.replaceState({}, "", "/shopping?x=1");
    render(<AuthGuard><span>content</span></AuthGuard>);
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/login"));
  });
});
