import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const validCount = value => Number.isSafeInteger(value) && value >= 0;
export function countErrors(results) {
  if (!Array.isArray(results) || results.some(result => !validCount(result?.errorCount))) throw new Error('Invalid ESLint results');
  return results.reduce((sum, result) => sum + result.errorCount, 0);
}
export function passesRatchet(errors, baseline) {
  if (!validCount(errors) || !validCount(baseline)) throw new Error('Invalid error count or baseline');
  return errors <= baseline;
}
function main() {
  const baseline = JSON.parse(readFileSync(new URL('./eslint-baseline.json', import.meta.url), 'utf8')).errors;
  const result = spawnSync('bunx', ['eslint', '.', '--format', 'json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error || ![0, 1].includes(result.status)) throw result.error ?? new Error(`ESLint failed with status ${result.status}: ${result.stderr}`);
  const results = JSON.parse(result.stdout);
  const errors = countErrors(results);
  console.log(`ESLint errors: ${errors}; baseline: ${baseline}`);
  if (result.stderr) process.stderr.write(result.stderr);
  if (!passesRatchet(errors, baseline)) {
    for (const file of results) for (const message of file.messages.filter(item => item.severity === 2)) {
      console.error(`${file.filePath}:${message.line}:${message.column} ${message.message} (${message.ruleId ?? 'parse error'})`);
    }
    console.error('ESLint error count exceeds baseline.');
    process.exitCode = 1;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
