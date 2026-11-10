import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const checker = 'scripts/ux/copy-check.mjs';
const run = (dir) => spawnSync(process.execPath, [checker, dir], { encoding: 'utf8' });
test('common fragment passes', () => assert.equal(run('src/lib/i18n/fragments').status, 0));
for (const [name, fragment, message] of [
  ['missing English', {he:{a:'שלום'},en:{}}, 'a'],
  ['reversed punctuation', {he:{a:'!שלום'},en:{a:'Hello'}}, 'punctuation'],
  ['em dash', {he:{a:'שלום'},en:{a:'Hello — there'}}, 'em dash'],
  ['English in Hebrew', {he:{a:'שלום world'},en:{a:'Hello'}}, 'English'],
]) test(name, async () => {
  const dir = await mkdtemp(join(process.cwd(), '.copy-check-'));
  try {
    await writeFile(join(dir, 'fixture.ts'), `export default ${JSON.stringify(fragment)};`);
    const result = run(dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, new RegExp(message, 'i'));
  } finally { await rm(dir, {recursive:true, force:true}); }
});
