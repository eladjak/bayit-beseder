import { test, expect } from "@playwright/test";

test.describe("Static Pages", () => {
  const pages = [
    { path: "/privacy", titlePart: "פרטיות" },
    { path: "/terms", titlePart: "תנאי" },
    { path: "/contact", titlePart: "צור קשר" },
    { path: "/offline", titlePart: "אופליין" },
  ];

  for (const { path } of pages) {
    test(`${path} loads correctly`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator("html")).toHaveAttribute("lang", "he");
      // Page should render without errors
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }
});
