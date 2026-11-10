# Local visual-test Supabase fake

Run `PORT=55481 node scripts/ux/mock-supabase.cjs` (default port 54329), then start the app with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55481` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=local-mock`. Use an unused port. The server listens only on 127.0.0.1 and rejects non-loopback Host headers. It holds everything in memory and writes no files. Tests: `node --test scripts/ux/__tests__/mock.test.mjs`.

Set a scenario with `POST /__scenario` and JSON `{"name":"normal"}`. Each change resets the data and write count. `GET /__state` reports the name and write count; `POST /__reset` restores normal.

- `normal`: Noa and Yoni, six tasks across three rooms (two done), nine shopping items in four categories (two checked), seven meals and a week's plan.
- `empty`: household and members exist, but tasks, shopping and meals are empty.
- `no-household`: the signed-in profile has no household.
- `first-run`: household exists with no task, shopping or meal data; clear the app's onboarding flags in browser storage separately.
- `error:<table>`: only that table returns a PostgREST-shaped 500.
- `rpc-error:<name>`: only the named RPC fails with 500.
- `slow:<ms>`: delay data and auth requests by that many milliseconds, capped at 30 seconds.

The fake supports simple column selections, eq/in/is, order, limit, single-object requests, inserts, updates and deletes, and the task completion transition RPC. It is intentionally not a full PostgREST implementation. Unknown tables and RPCs return 404. A browser harness must supply its own synthetic local auth session and block non-loopback requests.

`/meals` reads `/api/meals` and `/api/meals/plan` through Next server routes, which resolve a session via `src/lib/meals/session.ts`; they are not browser-to-Supabase requests. If the capture environment cannot supply that session, intercept those routes in the browser harness using the fixture meals and plan in this directory. Do not add a server key.

This fake cannot prove permissions/RLS, realtime, persistence, real network failures, or behavior of server routes requiring credentials. It is not a database or a security boundary for untrusted local users.
