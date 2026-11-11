#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { targetMode } from '../../e2e/smoke/guard.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let temp, mock, app;
const start = (cmd, args, env) => spawn(cmd, args, {cwd:root, env, stdio:'ignore'});
const stop = p => { if (p && p.exitCode === null) p.kill('SIGTERM'); };
const assertPortFree = port => new Promise((resolve,reject) => {const s=createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
const freePort = () => new Promise((resolve,reject) => {const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
const wait = async (url, proc) => {for(let i=0;i<120;i++){if(proc.exitCode!==null)throw Error('Local server exited');try{await fetch(url);return;}catch{} await new Promise(r=>setTimeout(r,500));}throw Error('Local server did not start');};
try {
  const remote = process.env.SMOKE_BASE_URL;
  const mode = targetMode(remote || 'http://127.0.0.1', process.env.SMOKE_ALLOW_PRODUCTION_READONLY);
  if (remote && !['SMOKE_MEMBER_EMAIL','SMOKE_MEMBER_PASSWORD','SMOKE_PARTNER_EMAIL','SMOKE_PARTNER_PASSWORD'].every(k=>process.env[k])) throw Error('Remote test account variables are required');
  let base = remote;
  if (!remote) {
    const appPort = await freePort();
    await assertPortFree(54329);
    mock = start(process.execPath,['scripts/ux/mock-supabase.cjs','54329'],process.env);
    await wait('http://127.0.0.1:54329/__state',mock);
    app = start(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(appPort)],process.env);
    base = `http://127.0.0.1:${appPort}`;
    await wait(base,app);
  }
  // Keep the temporary Playwright config and report inside this job's directory.
  temp = await mkdtemp(path.join(path.dirname(root),'smoke-'));
  const config = path.join(temp,'playwright.config.cjs'), report = path.join(temp,'report.json');
  await writeFile(config,`module.exports = { testDir: ${JSON.stringify(path.join(root,'e2e/smoke'))}, fullyParallel: false, workers: 1, timeout: 120000, expect: {timeout: 20000}, reporter: [['json', {outputFile: ${JSON.stringify(report)}}]], use: {baseURL: ${JSON.stringify(base)}, headless: true, viewport: {width: 375, height: 812}, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', serviceWorkers: 'block', launchOptions: {args: ['--no-sandbox']}} };\n`);
  const env = {...process.env, SMOKE_BASE_URL:base, SMOKE_MODE:mode, SMOKE_LOCAL:remote?'0':'1'};
  const child = start(process.execPath,['node_modules/@playwright/test/cli.js','test','--config',config],env);
  const code = await new Promise(resolve=>child.on('exit',resolve));
  let stats = {}; try {const result = await readFile(report,'utf8'); stats=JSON.parse(result).stats || {}; if (!remote) await writeFile(path.join(path.dirname(root),'smoke-result.json'),result); }catch{}
  const passed=stats.expected || 0, failed=(stats.unexpected || 0)+(stats.flaky || 0), skipped=stats.skipped || 0;
  console.log(`Smoke ${code===0?'PASS':'FAIL'}: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if(code!==0)process.exitCode=1;
} catch (error) { console.log(`Smoke FAIL: ${error.message === 'Production smoke target is blocked' ? error.message : 'setup failed'}; 0 passed, 0 failed, 0 skipped`); process.exitCode=1; }
finally {stop(app);stop(mock);if(temp)await rm(temp,{recursive:true,force:true});}
