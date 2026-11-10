import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe("UI build and override flags", () => {
  it.each([[undefined, false], ["true", true], ["1", false], ["TRUE", false], ["yes", false]])("build value %s", async (value, expected) => {
    vi.stubEnv("NEXT_PUBLIC_NEW_UI", value); vi.resetModules();
    const flag = await import("../ui-flag");
    expect(flag.NEW_UI_ENV_NAME).toBe("NEXT_PUBLIC_NEW_UI");
    expect(flag.UI_OVERRIDE_KEY).toBe("bayit-ui");
    expect(flag.isNewUiBuild()).toBe(expected);
  });
  it.each([["preview", "production", true], ["development", "production", true], ["production", "production", false], [undefined, "production", false], [undefined, "development", true]])("override %s / %s", async (env, node, expected) => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", env); vi.stubEnv("NODE_ENV", node); vi.resetModules();
    expect((await import("../ui-flag")).overrideAllowed()).toBe(expected);
  });
});
