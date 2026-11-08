Release runner: gpt-6.1-terra medium; 2026-11-08.
Typecheck: npx tsc --noEmit.
Lint: npm run lint.
Vitest: PATH=/opt/node22/bin:$PATH NODE_OPTIONS=--experimental-require-module npm test (Node v22.11.0).
Node: PATH=/opt/node22/bin:$PATH npm run test:node.
Build: Node 22 with loopback Supabase URL and inert key; no DB connection.
Browser: scripts/joy-e2e.config.cjs with loopback-only DNS and inert local server.
SQL: supabase/tests/atomic_task_completion.sql not run: no isolated database; production DB untouched.
Report doc-kit checks passed; 3 pages and mobile first page visually inspected.
