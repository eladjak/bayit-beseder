// @vitest-environment jsdom
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach } from "vitest";
import {
  Button,
  IconButton,
  Card,
  Field,
  QuickAdd,
  Check,
  HelpTip,
} from "../index-a";
vi.mock("@/components/voice-input-button", () => ({
  VoiceInputButton: ({
    onTranscript,
  }: {
    onTranscript: (value: string) => void;
  }) => (
    <button type="button" onClick={() => onTranscript("dictated")}>
      Mic
    </button>
  ),
}));
afterEach(cleanup);
describe("primitives A", () => {
  it("Button variants and loading retain accessible label", () => {
    for (const variant of ["primary", "quiet", "danger", "link"] as const) {
      const { unmount } = render(
        <Button variant={variant} loading>
          שמירה
        </Button>,
      );
      expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true");
      expect(screen.getByText("שמירה")).toBeTruthy();
      unmount();
    }
  });
  it("IconButton exposes its label", () => {
    render(<IconButton label="הוספה">+</IconButton>);
    expect(screen.getByRole("button", { name: "הוספה" })).toBeTruthy();
  });
  it("Card is interactive when requested", () => {
    render(<Card href="/tasks">משימות</Card>);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/tasks");
  });
  it("Field binds label, errors and LTR input types", () => {
    for (const type of ["tel", "email", "number", "date", "url"] as const) {
      const { unmount } = render(
        <Field label="פרט" type={type} error="נסו שוב" />,
      );
      const input = screen.getByLabelText("פרט");
      expect(input.getAttribute("dir")).toBe("ltr");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(
        screen.getByText("נסו שוב").parentElement?.getAttribute("aria-live"),
      ).toBe("polite");
      unmount();
    }
  });
  it("Field counts uncontrolled textarea characters", () => {
    render(<Field label="הערות" multiline maxLength={10} />);
    fireEvent.input(screen.getByLabelText("הערות"), {
      target: { value: "שלום" },
    });
    expect(screen.getByText("4 / 10")).toBeTruthy();
  });
  it("QuickAdd preserves failures and clears on success", async () => {
    const submit = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "נסו שוב" })
      .mockResolvedValueOnce({ ok: true });
    render(
      <QuickAdd
        label="הוספה"
        placeholder="למשל: חלב"
        submitLabel="שליחה"
        errorMessage="נסו שוב"
        savedMessage="נוסף"
        onSubmit={submit}
      />,
    );
    const input = screen.getByRole("textbox", {
      name: "הוספה",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "חלב" } });
    fireEvent.submit(input.closest("form")!);
    await screen.findByText("נסו שוב");
    expect(input.value).toBe("חלב");
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(input.value).toBe(""));
  });
  it("Check is controlled and pending is disabled", () => {
    const toggle = vi.fn();
    const { rerender } = render(
      <Check label="כביסה" checked={false} pending={false} onToggle={toggle} />,
    );
    const control = screen.getByRole("checkbox");
    fireEvent.click(control);
    expect(toggle).toHaveBeenCalledOnce();
    expect(control.getAttribute("aria-checked")).toBe("false");
    rerender(<Check label="כביסה" checked={false} pending onToggle={toggle} />);
    expect(control.hasAttribute("disabled")).toBe(true);
  });
  it("Check uses a normalized stroke for the draw animation", () => {
    render(<Check label="כביסה" checked pending={false} onToggle={() => {}} />);
    expect(
      document
        .querySelector(".bb-mark__check path")
        ?.getAttribute("pathLength"),
    ).toBe("1");
  });
  it("Check never claims success when a fake server rejects the change", async () => {
    function Example() {
      const [pending, setPending] = useState(false);
      const [failed, setFailed] = useState(false);
      return (
        <Check
          checked={false}
          pending={pending}
          failed={failed}
          label="כביסה"
          onToggle={async () => {
            setPending(true);
            await Promise.resolve();
            setFailed(true);
            setPending(false);
          }}
        />
      );
    }
    render(<Example />);
    const control = screen.getByRole("checkbox");
    fireEvent.click(control);
    expect(control.getAttribute("aria-checked")).toBe("false");
    await waitFor(() => expect(control.hasAttribute("disabled")).toBe(false));
    expect(control.getAttribute("aria-checked")).toBe("false");
    expect(control.firstElementChild?.className).toContain(
      "border-bb-danger-ink",
    );
  });
  it("HelpTip associates its native popover", () => {
    render(<HelpTip topic="שיתוף">הסבר קצר</HelpTip>);
    const button = screen.getByRole("button", { name: "הסבר: שיתוף" });
    expect(button.getAttribute("popovertarget")).toBeTruthy();
    expect(screen.getByText("הסבר קצר").getAttribute("popover")).toBe("auto");
  });
});

describe("review regressions", () => {
  it("enforces loading and target sizes", () => {
    const click = vi.fn();
    const { unmount } = render(
      <Button loading onClick={click}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(click).not.toHaveBeenCalled();
    unmount();
    const icon = render(<IconButton label="Add" />);
    expect(screen.getByRole("button").className).toContain("min-h-11");
    expect(screen.getByRole("button").className).toContain("min-w-11");
    icon.unmount();
    const check = render(
      <Check
        label="Task"
        checked={false}
        pending={false}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByRole("checkbox").className).toContain("size-11");
    check.unmount();
    render(<HelpTip topic="Info">Details</HelpTip>);
    expect(screen.getByRole("button").className).toContain("size-11");
  });
  it("preserves anchor attributes and handler", () => {
    const click = vi.fn();
    render(
      <Button
        href="/tasks"
        aria-label="Tasks"
        data-testid="link"
        onClick={click}
      >
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Tasks" }));
    expect(click).toHaveBeenCalledOnce();
    expect(screen.getByTestId("link")).toBeTruthy();
  });
  it("sets appropriate field input attributes and announces late errors", () => {
    for (const [type, mode, autocomplete] of [
      ["tel", "tel", "tel"],
      ["email", "email", "email"],
      ["number", "decimal", "off"],
      ["url", "url", "url"],
      ["date", null, "off"],
    ] as const) {
      const { rerender, unmount } = render(<Field label="Field" type={type} />);
      const input = screen.getByLabelText("Field");
      expect(input.getAttribute("inputmode")).toBe(mode);
      expect(input.getAttribute("autocomplete")).toBe(autocomplete);
      rerender(<Field label="Field" type={type} error="Error" />);
      expect(input.getAttribute("aria-describedby")).toBe(
        screen.getByText("Error").id,
      );
      expect(
        screen.getByText("Error").parentElement?.getAttribute("aria-live"),
      ).toBe("polite");
      unmount();
    }
  });
  it("resets the uncontrolled textarea counter with its form", async () => {
    render(
      <form>
        <Field label="Notes" multiline maxLength={10} defaultValue="abc" />
        <button type="reset">Reset</button>
      </form>,
    );
    fireEvent.input(screen.getByLabelText("Notes"), {
      target: { value: "abcdef" },
    });
    fireEvent.click(screen.getByText("Reset"));
    await waitFor(() => expect(screen.getByText("3 / 10")).toBeTruthy());
  });
  it("exposes failed check without relying on colour", () => {
    render(
      <Check
        label="Task"
        checked={false}
        pending={false}
        failed
        onToggle={() => {}}
      />,
    );
    expect(screen.getByRole("checkbox").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByRole("checkbox").querySelector("svg")).toBeTruthy();
  });
  it("associates a tooltip without imposing direction", () => {
    render(<HelpTip topic="Info">Details</HelpTip>);
    const button = screen.getByRole("button");
    const tip = screen.getByText("Details");
    expect(button.getAttribute("aria-describedby")).toBe(tip.id);
    expect(tip.getAttribute("role")).toBe("tooltip");
    expect(tip.hasAttribute("dir")).toBe(false);
  });
  it("prevents duplicate submission and preserves edits made while saving", async () => {
    let resolve!: (value: { ok: true }) => void;
    const submit = vi.fn(
      () =>
        new Promise<{ ok: true }>((r) => {
          resolve = r;
        }),
    );
    render(
      <QuickAdd
        label="Add"
        placeholder="Example"
        submitLabel="Send"
        errorMessage="Error"
        savedMessage="Added"
        onSubmit={submit}
      />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "first" } });
    fireEvent.submit(input.closest("form")!);
    fireEvent.submit(input.closest("form")!);
    expect(submit).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: "second" } });
    resolve({ ok: true });
    await screen.findByText("Added");
    expect(input.value).toBe("second");
  });
  it("appends a voice transcript to typed text", () => {
    render(
      <QuickAdd
        label="Add"
        placeholder="Example"
        submitLabel="Send"
        errorMessage="Error"
        savedMessage="Added"
        onSubmit={async () => ({ ok: true })}
      />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "typed" } });
    fireEvent.click(screen.getByText("Mic"));
    expect(input.value).toBe("typed dictated");
  });
});
