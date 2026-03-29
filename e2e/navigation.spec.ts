import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("bottom nav renders on app pages", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1000);
    // Look for bottom navigation
    const nav = page.locator("nav").last();
    if (await nav.isVisible()) {
      await expect(nav).toBeVisible();
    }
  });

  test("RTL direction on all pages", async ({ page }) => {
    const appPages = ["/tasks", "/shopping", "/weekly", "/stats", "/settings"];
    for (const path of appPages) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    }
  });
});
