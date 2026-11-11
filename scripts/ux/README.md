# Local UX capture

From a fresh clone run `bun install --frozen-lockfile`, start a local app and a local fake backend. This tool never calls non-loopback hosts. Use Node 22 and a private installation because playwright is not a project dependency:

```sh
export PATH=/root/.bun/bin:/opt/node22/bin:$PATH
mkdir -p /root/work/your-job/private
(cd /root/work/your-job/private && bun add playwright@1.58.2)
export NODE_PATH=/root/work/your-job/private/node_modules
node scripts/ux/shoot.mjs --base http://127.0.0.1:3000 --states scripts/ux/states.example.json --out /root/work/your-job/shots
node --test scripts/ux/__tests__/checks.test.mjs
```

Chromium defaults to `/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`; override with `CHROMIUM_PATH`. Use a free port and verify the server belongs to this checkout. `--scenario-url http://127.0.0.1:PORT` POSTs `{ "scenario": "..." }` to `/__scenario`; the planner's older mock does not support scenarios. The example generates a synthetic fake-only session cookie at runtime via `plannerFake` and sets onboarding flags; it cannot authenticate against a real service. `--ui v2` is reserved and ignored until F-01 is integrated. `--baseline path/to/report.json` prints only findings absent on the matching name and width in the earlier report; report.json remains complete.

Each state accepts route, name, widths, optional scenario, cookies (Playwright cookie objects without a URL), storage (localStorage keys and values), reducedMotion, dark, routes (URL substring, status, body), and actions. Actions are `{ "type": "click", "role": "button", "name": "..." }`, `fill` with `value`, `press` with `key`, or `waitForText` with `text`. Roles use exact accessible names by default; set `exact: false` for partial matches. Mocks match loopback requests only. The full-page image hides fixed elements; the fold retains them. A timed-out loading or visible image wait sets `stillLoading`, and navigation failure exits nonzero.

Console errors containing `websocket` or `realtime` are tagged `known-harness` (the local fake has no realtime websocket); other errors are unclassified. Confirm the cause before ignoring any error. These measurements are heuristics: they do not prove accessibility, focus order, real permissions, persistence, network behavior or accurate contrast over images, gradients, transparency or overlays. Names are best-effort, not the browser's complete accessible-name algorithm. Inspect screenshots and test actual interactions separately. Baseline compares finding identity, not severity or changes in size/contrast.
