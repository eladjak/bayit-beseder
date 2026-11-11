import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const directory = 'scripts/ux/__tests__';
const files = readdirSync(directory).filter(name => name.endsWith('.test.mjs')).sort().map(name => join(directory, name));
if (!files.length) {
  console.error(`No test files found in ${directory}`);
  process.exit(1);
}
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
