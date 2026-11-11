import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

// Brand names may appear in Hebrew copy; add approved names here as needed.
const brands = new Set(['WhatsApp', 'Google']);
const dir = resolve(process.argv[2] ?? 'src/lib/i18n/fragments');
const errors = [];
function check(he, en, path) {
  const heObject = he && typeof he === 'object' && !Array.isArray(he);
  const enObject = en && typeof en === 'object' && !Array.isArray(en);
  if (heObject && enObject) {
    for (const key of new Set([...Object.keys(he), ...Object.keys(en)])) check(he[key], en[key], `${path}.${key}`);
  } else if (typeof he !== 'string' || typeof en !== 'string') {
    errors.push(`${path}: missing key or different tree shape`);
  } else {
    if (/^[!?. ,:]/.test(he.trimStart())) errors.push(`${path}: reversed punctuation`);
    if (/[—]/.test(he) || /[—]/.test(en)) errors.push(`${path}: em dash`);
    const text = he.replace(/\{[^{}]+\}/g, '');
    const words = text.match(/[A-Za-z]+/g) ?? [];
    if (words.some(word => !brands.has(word))) errors.push(`${path}: English in Hebrew`);
  }
}
try {
  const files = (await readdir(dir)).filter(file => file.endsWith('.ts') && file !== 'types.ts' && !file.endsWith('.d.ts')).sort();
  for (const file of files) {
    try {
      const source = await readFile(resolve(dir, file), 'utf8');
      const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
      const fragment = (await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)).default;
      check(fragment?.he, fragment?.en, file);
    } catch (error) { errors.push(`${file}: ${error.message}`); }
  }
  if (!files.length) errors.push(`${dir}: no fragment files found`);
} catch (error) { errors.push(`${dir}: ${error.message}`); }
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Copy fragments passed.');
