import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countErrors, passesRatchet } from '../eslint-ratchet.mjs';

test('counts errors across files and ignores warnings', () => {
  assert.equal(countErrors([{ errorCount: 2, warningCount: 8 }, { errorCount: 1 }]), 3);
});
test('allows the baseline and fails above it', () => {
  assert.equal(passesRatchet(2, 2), true);
  assert.equal(passesRatchet(3, 2), false);
});
test('rejects malformed ESLint output and baseline', () => {
  assert.throws(() => countErrors([{ errorCount: -1 }]));
  assert.throws(() => countErrors({}));
  assert.throws(() => passesRatchet(0, -1));
});
