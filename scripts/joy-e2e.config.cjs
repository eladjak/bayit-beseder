/* eslint-disable @typescript-eslint/no-require-imports -- Standalone local Playwright config. */
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '../e2e',
  reporter: [['list']],
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:3133',
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    launchOptions: {
      executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
      args: ['--no-sandbox', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'],
    },
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
  ],
});
