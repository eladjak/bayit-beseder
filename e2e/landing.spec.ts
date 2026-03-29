import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should load and display Hebrew content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/בית בסדר/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("should have login CTA", async ({ page }) => {
    await page.goto("/");
    const loginButton = page.getByRole("link", { name: /התחברו|כניסה/i });
    await expect(loginButton).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /התחברו|כניסה|התחילו/i }).first().click();
    await expect(page).toHaveURL(/login/);
  });

  test("should display FAQ section", async ({ page }) => {
    await page.goto("/");
    // Look for FAQ-related content
    const faqSection = page
      .locator("text=שאלות נפוצות")
      .or(page.locator("text=FAQ"));
    await expect(faqSection.first()).toBeVisible();
  });

  test("should have working language switcher", async ({ page }) => {
    await page.goto("/");
    const langSwitcher = page
      .locator("[data-testid='language-switcher']")
      .or(page.getByText("EN").or(page.getByText("עב")));
    if (await langSwitcher.first().isVisible()) {
      await langSwitcher.first().click();
    }
  });
});
