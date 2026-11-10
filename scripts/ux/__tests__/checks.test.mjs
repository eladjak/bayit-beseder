import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { measure, newViolations } from '../checks.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
after(() => browser.close());
async function check(name) { const page = await browser.newPage({viewport:{width:375,height:800}}); await page.goto(pathToFileURL(new URL(`./fixtures/${name}.html`, import.meta.url).pathname).href); const findings = await measure(page); await page.close(); return findings; }
test('bad fixture finds overflow, small target and low contrast', async () => { const findings = await check('bad'); assert.deepEqual(findings.map(x => x.type).sort(), ['contrast','overflow','target']); });
test('clean fixture has no findings', async () => { assert.deepEqual(await check('clean'), []); });
test('baseline lists only new findings', () => { const a={screens:[{name:'home',width:375,findings:[{type:'target',selector:'#a'}]}]}; const b={screens:[{name:'home',width:375,findings:[{type:'target',selector:'#a'},{type:'overflow',selector:'html'}]}]}; assert.deepEqual(newViolations(a,b).screens[0].findings,[{type:'overflow',selector:'html'}]); });
