Release runner: gpt-6.1-terra medium; 2026-11-08.
Typecheck: npx tsc --noEmit.
Lint: npm run lint.
Vitest: PATH=/opt/node22/bin:$PATH NODE_OPTIONS=--experimental-require-module npm test (Node v22.11.0).
Node: PATH=/opt/node22/bin:$PATH npm run test:node.
Build: Node 22 with loopback Supabase URL and inert key; no DB connection.
Browser: scripts/joy-e2e.config.cjs with loopback-only DNS and inert local server.
SQL: supabase/tests/atomic_task_completion.sql not run: no isolated database; production DB untouched.
Report doc-kit checks passed; 3 pages and mobile first page visually inspected.
Browser results: first development-server run 27/28 (desktop FAQ absent); focused FAQ retry passed. Second development-server run interrupted after FAQ failed on both viewports. FAQ is an unchanged ssr:false dynamic component; browser errors were not captured, so cause not established. Rebuilt production artifact and ran all 28 tests via next start: 28 passed. Browser tests remain unauthenticated/conditional and do not establish real-account flows.
