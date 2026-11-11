import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/bb-tokens.css', 'utf8');
const rules = [...css.replace(/@source inline\([^;]+;/g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const names = new Set(rules.flatMap(([, , body]) => [...body.matchAll(/(--bb-[\w-]+)\s*:/g)].map(match => match[1])));
const required = ['primary','primary-hover','primary-50','on-primary','ink','ink-2','ink-3','ink-4','paper','card','card-hover','line','line-strong','honey','peach','coral','sky','mint','honey-50','peach-50','coral-50','sky-50','mint-50','success-ink','success-50','warning-ink','warning-50','danger-ink','danger-50','r-sm','r-md','r-lg','r-pill','shadow-1','shadow-2','shadow-3','ease-out','dur-fast','dur','dur-sheet', ...['xs','sm','base','lg','xl','2xl'].flatMap(size => [`text-${size}`, `text-${size}-line-height`])];
describe('v2 tokens', () => {
  it('defines the canonical token names', () => {
    for (const token of required) expect(names.has(`--bb-${token}`), token).toBe(true);
  });
  it('scopes every selector to the v2 switch', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const [, selector] of rules) for (const part of selector.split(',')) expect(part).toContain('[data-ui="v2"]');
  });
});
