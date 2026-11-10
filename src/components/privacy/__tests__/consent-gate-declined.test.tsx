/**
 * Someone who declines the privacy gate must be able to reach "delete my
 * account" and "cancel my subscription" FROM the gate itself (Settings is
 * behind the gate), and declining must not silently sign them out.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const signOut = vi.fn(async () => ({}));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ t: (k: string) => k, locale: "he" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/supabase", () => ({ createClient: () => ({ auth: { signOut } }) }));
vi.mock("@/components/language-toggle", () => ({ LanguageToggle: () => <span>lang</span> }));
vi.mock("@/components/settings/delete-account-section", () => ({
  DeleteAccountSection: ({ onGate }: { onGate?: boolean }) => <div data-testid="delete-account" data-on-gate={String(!!onGate)} />,
}));
vi.mock("@/components/settings/subscription-section", () => ({
  SubscriptionSection: ({ cancelOnly }: { cancelOnly?: boolean }) => <div data-testid="cancel-subscription" data-cancel-only={String(!!cancelOnly)} />,
}));

import { ConsentGate } from "../ConsentGate";

afterEach(() => {
  cleanup();
  signOut.mockClear();
});

describe("ConsentGate: declining", () => {
  it("'not now' opens the options instead of signing the person out", () => {
    render(<ConsentGate onAccepted={() => undefined} />);
    expect(screen.queryByTestId("delete-account")).toBeNull();
    fireEvent.click(screen.getByText("privacy.gate.notNow"));
    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByText("privacy.gate.declinedTitle")).toBeTruthy();
    expect(screen.getByTestId("delete-account").getAttribute("data-on-gate")).toBe("true");
    expect(screen.getByTestId("cancel-subscription").getAttribute("data-cancel-only")).toBe("true");
    expect(screen.getByText("privacy.gate.signOut")).toBeTruthy();
  });

  it("sign out from the declined view signs out", () => {
    render(<ConsentGate onAccepted={() => undefined} />);
    fireEvent.click(screen.getByText("privacy.gate.notNow"));
    fireEvent.click(screen.getByText("privacy.gate.signOut"));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("'back' returns to the confirmation form", () => {
    render(<ConsentGate onAccepted={() => undefined} />);
    fireEvent.click(screen.getByText("privacy.gate.notNow"));
    fireEvent.click(screen.getByText("privacy.gate.declinedBack"));
    expect(screen.getByText("privacy.gate.accept")).toBeTruthy();
    expect(screen.queryByTestId("delete-account")).toBeNull();
  });
});
