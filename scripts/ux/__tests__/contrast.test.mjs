import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
const script = 'scripts/ux/contrast.mjs';
test('real tokens pass, a failing contrast fixture fails', () => {
  assert.equal(spawnSync(process.execPath, [script]).status, 0);
  const dir = mkdtempSync(join(process.cwd(), '.bb-contrast-'));
  try {
    const css = readFileSync('src/styles/bb-tokens.css', 'utf8').replace('--bb-ink: #2A2440', '--bb-ink: #FAF6F0');
    const fixture = join(dir, 'tokens.css'); writeFileSync(fixture, css);
    const red = spawnSync(process.execPath, [script, fixture], {encoding: 'utf8'});
    assert.equal(red.status, 1); assert.match(red.stdout, /ink\/paper .*FAIL/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
