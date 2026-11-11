import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetMode } from '../../../e2e/smoke/guard.ts';

test('production requires explicit read-only permission', () => {
  for (const url of ['https://bayit-beseder.vercel.app', 'https://www.bayitbeseder.com', 'https://bayitbeseder.com']) {
    assert.throws(() => targetMode(url, undefined));
    assert.equal(targetMode(url, '1'), 'readonly');
  }
});
test('preview is writable and malformed URLs are rejected', () => {
  assert.equal(targetMode('https://example.invalid', undefined), 'full');
  assert.throws(() => targetMode('file:///tmp/test', undefined));
  assert.throws(() => targetMode('https://user:password@example.invalid', undefined));
});

test('fake auth distinguishes the two household members and supports logout', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { createMock } = require('../../ux/mock-supabase.cjs');
  const server = createMock().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = async email => {
      const response = await fetch(`${base}/auth/v1/token?grant_type=password`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'fake-password'})});
      assert.equal(response.status, 200);
      return response.json();
    };
    const a = await login('member@example.invalid');
    const b = await login('partner@example.invalid');
    assert.notEqual(a.user.id, b.user.id);
    for (const session of [a,b]) {
      const response = await fetch(`${base}/auth/v1/user`, {headers:{authorization:`Bearer ${session.access_token}`}});
      assert.equal((await response.json()).id, session.user.id);
    }
    assert.equal((await fetch(`${base}/auth/v1/logout`, {method:'POST',headers:{authorization:`Bearer ${a.access_token}`}})).status, 204);
    assert.equal((await fetch(`${base}/auth/v1/user`, {headers:{authorization:`Bearer ${a.access_token}`}})).status, 401);
  } finally { server.close(); }
});

test('runner refuses production without printing a supplied secret', async () => {
  const { spawnSync } = await import('node:child_process');
  const marker = 'DO-NOT-PRINT-TEST-SECRET';
  const result = spawnSync(process.execPath, ['scripts/smoke/run.mjs'], {env:{...process.env,SMOKE_BASE_URL:'https://bayit-beseder.vercel.app',SMOKE_MEMBER_PASSWORD:marker},encoding:'utf8'});
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(marker));
  assert.match(result.stdout + result.stderr, /blocked/i);
});
