import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({ Heebo: () => ({ variable: "heebo" }) }));
vi.mock("@/components/ThemeProvider", () => ({
  ThemeScript: () => <script data-theme-script="true" />,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/LanguageProvider", () => ({ LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/BootReady", () => ({ BootReady: () => null }));
vi.mock("sonner", () => ({ Toaster: () => null }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function layout(env: string) {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", env);
  vi.stubEnv("NEXT_PUBLIC_NEW_UI", "false");
  vi.resetModules();
  return import("../layout");
}
function head(html: string) { return html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? ""; }

it("retains the viewport settings without restricting zoom", async () => {
  const { viewport } = await layout("production");
  expect(viewport).toMatchObject({ themeColor: "#4F46E5", width: "device-width", initialScale: 1 });
  expect(viewport.maximumScale).toBeUndefined();
  expect(viewport.userScalable).not.toBe(false);
});

it("places the preview flag script immediately after the theme script and omits it in production", async () => {
  const preview = await layout("preview");
  const previewHead = head(renderToStaticMarkup(<preview.default>child</preview.default>));
  const production = await layout("production");
  const productionHead = head(renderToStaticMarkup(<production.default>child</production.default>));
  const flag = previewHead.match(/<script>\(function\(\)\{\s*var enabled = [\s\S]*?<\/script>/)?.[0];
  expect(flag).toBeDefined();
  expect(previewHead).toContain(`<script data-theme-script="true"></script>${flag}`);
  expect(previewHead.replace(flag!, "")).toBe(productionHead);
});
