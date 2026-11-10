import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Text on surfaces and status tints: 4.5:1; graphical boundaries: 3:1.
const pairs = [
  ...['ink', 'ink-2', 'ink-3'].flatMap(ink => ['paper', 'card'].map(bg => [ink, bg, 4.5])),
  ...['success', 'warning', 'danger'].flatMap(status => [[`${status}-ink`, 'paper', 4.5], [`${status}-ink`, `${status}-50`, 4.5]]),
  ...['ink-4', 'line-strong'].flatMap(ink => ['paper', 'card'].map(bg => [ink, bg, 3])),
  ['on-primary', 'primary', 4.5], ['on-primary', 'primary-hover', 4.5],
];
const path = process.argv[2] || fileURLToPath(new URL('../../src/styles/bb-tokens.css', import.meta.url));
const css = readFileSync(path, 'utf8');
const rules = [...css.replace(/@source inline\([^;]+;/g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({selector: selector.trim(), values: Object.fromEntries([...body.matchAll(/--bb-([\w-]+)\s*:\s*([^;]+);/g)].map(([, key, value]) => [key, value.trim()]))}));
const base = rules.find(r => r.selector === ':root[data-ui="v2"]')?.values;
const dark = rules.find(r => r.selector === ':root[data-ui="v2"].dark')?.values;
if (!base || !dark) { console.error('Missing base or dark token rule'); process.exit(1); }
function luminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) throw new Error(`Invalid colour: ${hex}`);
  const rgb = hex.slice(1).match(/../g).map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
let failed = false;
for (const mode of ['light', 'dark']) {
  for (const choice of ['default', '2563EB', '7C3AED', 'DB2777', '059669', 'EA580C']) {
    const choiceRule = choice === 'default' ? {} : rules.find(r => r.selector.includes(`#${choice}`))?.values;
    if (!choiceRule) { console.error(`Missing choice ${choice}`); failed = true; continue; }
    const values = {...base, ...(mode === 'light' ? choiceRule : dark)};
    for (const [fg, bg, min] of pairs) {
      try {
        const a = luminance(values[fg]), b = luminance(values[bg]);
        const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        const pass = ratio >= min;
        console.log(`${mode} ${choice} ${fg}/${bg} ${ratio.toFixed(2)} (>=${min}) ${pass ? 'PASS' : 'FAIL'}`);
        if (!pass) failed = true;
      } catch (error) { console.error(error.message); failed = true; }
    }
  }
}
if (failed) process.exitCode = 1;
