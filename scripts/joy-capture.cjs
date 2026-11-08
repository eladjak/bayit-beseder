/* eslint-disable @typescript-eslint/no-require-imports -- Standalone local CommonJS capture harness. */
// Usage: NODE_PATH=/tmp/joy-browser/node_modules /opt/node22/bin/node scripts/joy-capture.cjs <port> <label>
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const [port, label] = process.argv.slice(2);
  if (!/^\d+$/.test(port) || !/^[-\w]+$/.test(label))
    throw Error("port and label required");
  const dir = path.resolve("docs/joy-restore/evidence", label);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 1,
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    recordVideo: { dir, size: { width: 375, height: 812 } },
  });
  // All external network is blocked, except the synthetic local database.
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (
      u.hostname === "127.0.0.1" ||
      u.hostname === "localhost" ||
      u.protocol === "data:"
    )
      return route.continue();
    return route.abort();
  });
  await context.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important }";
    document.addEventListener(
      "DOMContentLoaded",
      () => document.head.appendChild(style),
      { once: true },
    );
  });
  const page = await context.newPage();
  async function fullCapture(name) {
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/${name}-full.png`, fullPage: true });
  }
  const origin = `http://127.0.0.1:${port}`;
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/landing.png` });
  if (label === "new") await fullCapture("landing");
  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/login.png` });
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "demo@example.invalid",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 86400,
    }),
  ).toString("base64url");
  const session = {
    access_token: `e30.${payload}.fake`,
    refresh_token: "fake",
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    expires_in: 86400,
    token_type: "bearer",
    user,
  };
  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.addInitScript(() => {
    localStorage.setItem("bayit-first-visit-tasks", "1");
    localStorage.setItem("bayit-first-visit-dashboard", "1");
    localStorage.setItem(
      "bayit-pet-collection-v1",
      JSON.stringify([
        "dog",
        "cat",
        "rabbit",
        "fox",
        "panda",
        "koala",
        "hedgehog",
        "owl",
      ]),
    );
    localStorage.setItem(
      "bayit-bg-collection-v1",
      JSON.stringify(["default", "warm-rose", "soft-cream"]),
    );
    localStorage.setItem("bayit-welcome-gift-claimed-v1", "1");
    localStorage.setItem("bayit-onboarding-done-v1", "1");
    localStorage.setItem("bayit-beseder-onboarding-done", "true");
  });
  for (const [name, url] of [
    ["dashboard", "/dashboard"],
    ["tasks", "/tasks"],
    ["settings", "/settings"],
  ]) {
    await page.goto(origin + url, { waitUntil: "domcontentloaded" });
    if (name === "dashboard" || name === "tasks")
      await page.waitForFunction(
        () => document.body.innerText.includes("לשטוף כלים"),
        null,
        { timeout: 20000 },
      );
    if (name === "settings")
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("input")].some(
            (input) => input.value === "נועה",
          ),
        null,
        { timeout: 20000 },
      );
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${dir}/${name}.png` });
    if (label === "new") await fullCapture(name);
    console.log(
      name,
      page.url(),
      (await page.locator("body").innerText()).slice(0, 250),
    );
  }
  await page.evaluate(() =>
    localStorage.setItem("bayit-beseder-theme", "dark"),
  );
  await page.goto(origin + "/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${dir}/dashboard-dark.png` });
  await page.evaluate(() =>
    localStorage.setItem("bayit-beseder-theme", "light"),
  );
  await page.goto(origin + "/tasks", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const button = page
    .getByRole("button", { name: /סמן כהושלם: לשטוף כלים/ })
    .filter({ visible: true })
    .first();
  if (await button.count()) {
    await button.click();
    await page.waitForTimeout(1200);
    const state = await (
      await page.request.get("http://127.0.0.1:54329/state")
    ).json();
    if (
      !(await page.getByText("כל הכבוד!", { exact: false }).count()) ||
      !state.completed
    )
      throw Error("Completion toast or mock state missing");
    await page.screenshot({ path: `${dir}/completion.png` });
  } else throw Error("Missing completion button");
  await page.waitForTimeout(1000);
  await page.request.get("http://127.0.0.1:54329/empty");
  await page.goto(origin + "/tasks", { waitUntil: "domcontentloaded" });
  if (label === "new")
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("עוד לא הוספתם משימות לבית") &&
        [...document.images]
          .filter((i) => i.getClientRects().length)
          .every((i) => i.complete && i.naturalWidth > 0) &&
        [...document.images].some(
          (i) =>
            i.currentSrc.includes("empty-tasks") &&
            i.complete &&
            i.naturalWidth > 0,
        ),
      null,
      { timeout: 30000 },
    );
  else await page.waitForTimeout(3000);
  await page.screenshot({ path: `${dir}/empty.png` });
  await page.goto(origin + "/dashboard", { waitUntil: "domcontentloaded" });
  if (label === "new")
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("אין כרגע משימות פתוחות ברשימה") &&
        [...document.images]
          .filter((i) => i.getClientRects().length)
          .every((i) => i.complete && i.naturalWidth > 0) &&
        [...document.images].some(
          (i) =>
            i.currentSrc.includes("empty-tasks") &&
            i.complete &&
            i.naturalWidth > 0,
        ),
      null,
      { timeout: 30000 },
    );
  else await page.waitForTimeout(3000);
  await page.screenshot({ path: `${dir}/dashboard-empty.png` });
  await context.close();
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
