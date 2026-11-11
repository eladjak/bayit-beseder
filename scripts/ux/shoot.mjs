#!/usr/bin/env node
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { measure, newViolations } from './checks.mjs';
const require=createRequire(import.meta.url), {chromium}=require('playwright');
const args=process.argv.slice(2), opts={};
for(let i=0;i<args.length;i++){if(!args[i].startsWith('--')||!args[i+1])throw Error(`Invalid argument: ${args[i]}`);opts[args[i].slice(2)]=args[++i];}
if(!opts.base||!opts.states||!opts.out)throw Error('Usage: shoot.mjs --base URL --states FILE --out DIR [--scenario-url URL] [--ui v2] [--baseline REPORT]');
const loopback=url=>{try{return ['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname);}catch{return false;}};
if(!loopback(opts.base)||opts['scenario-url']&&!loopback(opts['scenario-url']))throw Error('Base and scenario URL must be loopback');
const states=JSON.parse(await readFile(opts.states,'utf8'));if(!Array.isArray(states))throw Error('States must be an array');
await mkdir(opts.out,{recursive:true});
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args:['--no-sandbox']});
 const report={screens:[]};
 for(const state of states)for(const width of state.widths){
  if(!/^[\w-]+$/.test(state.name))throw Error('State names must contain only letters, digits, underscores or hyphens');
  if(state.scenario){if(!opts['scenario-url'])throw Error('scenario-url is required for scenario');const res=await fetch(new URL('/__scenario',opts['scenario-url']),{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({scenario:state.scenario})});if(!res.ok)throw Error(`Scenario failed: ${res.status}`);}
  const context=await browser.newContext({viewport:{width,height:800},locale:'he-IL',timezoneId:'Asia/Jerusalem',reducedMotion:state.reducedMotion?'reduce':'no-preference',colorScheme:state.dark?'dark':'light',serviceWorkers:'block'});
  await context.route('**/*',async route=>{const url=route.request().url();if(!loopback(url))return route.abort();const mock=(state.routes||[]).find(x=>url.includes(x.url));if(mock)return route.fulfill({status:mock.status||200,contentType:'application/json',body:typeof mock.body==='string'?mock.body:JSON.stringify(mock.body)});return route.continue();});
  await context.routeWebSocket('**/*', ws=>{if(loopback(ws.url()))ws.connectToServer();else ws.close();});
  if(state.plannerFake){const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'demo@example.invalid',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};const exp=Math.floor(Date.now()/1000)+86400;const payload=Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp})).toString('base64url');const session={access_token:`e30.${payload}.fake`,refresh_token:'fake',expires_at:exp,expires_in:86400,token_type:'bearer',user};await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:new URL(opts.base).origin}]);}
  if(state.cookies)await context.addCookies(state.cookies.map(c=>({...c,url:new URL(opts.base).origin})));
  if(state.storage)await context.addInitScript(storage=>{for(const [k,v] of Object.entries(storage))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));},state.storage);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const url=new URL(state.route,opts.base);if(!loopback(url.href))throw Error(`Route must be loopback: ${url}`);
  // The F-01 override is not present on this base branch; --ui is reserved.
  let response;try{response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:300000});}catch(e){throw Error(`Cannot open ${url}: ${e.message}`);}
  await page.waitForLoadState('networkidle',{timeout:12000}).catch(()=>{});
  const ready=async()=>page.waitForFunction(()=>[...document.querySelectorAll('[aria-busy="true"],body *')].every(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none')return true;if(e.matches('[aria-busy="true"]'))return false;return ![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.includes('טוען'));})&&[...document.images].every(i=>{const r=i.getBoundingClientRect();return !r.width||!r.height||i.complete;}),null,{timeout:12000}).then(()=>false).catch(()=>true);
  let stillLoading=await ready();
  for(const action of state.actions||[]){const loc=action.role?page.getByRole(action.role,{name:action.name,exact:action.exact!==false}):null;switch(action.type){case 'click':await loc.click();break;case 'fill':await loc.fill(action.value);break;case 'press':await loc.press(action.key);break;case 'waitForText':await page.getByText(action.text,{exact:action.exact!==false}).waitFor({state:'visible',timeout:12000});break;default:throw Error(`Unknown action ${action.type}`);}}
  if(state.actions?.length)stillLoading=await ready()||stillLoading;
  const findings=await measure(page);for(const message of errors)findings.push({type:'console',message,tag:/websocket|realtime/i.test(message)?'known-harness':'unclassified'});
  await page.screenshot({path:`${opts.out}/${state.name}-${width}-fold.png`});
  await page.addStyleTag({content:'* { scroll-behavior: auto !important; } .ux-capture-fixed { visibility: hidden !important; }'});
  await page.evaluate(()=>document.querySelectorAll('*').forEach(e=>{if(getComputedStyle(e).position==='fixed')e.classList.add('ux-capture-fixed');}));
  await page.screenshot({path:`${opts.out}/${state.name}-${width}-full.png`,fullPage:true});
  report.screens.push({name:state.name,width,route:state.route,status:response?.status()??null,finalUrl:page.url(),stillLoading,findings});await context.close();
 }
 await writeFile(`${opts.out}/report.json`,JSON.stringify(report,null,2)+'\n');
 const selected=opts.baseline?newViolations(JSON.parse(await readFile(opts.baseline,'utf8')),report):report;
 const lines=selected.screens.map(s=>`- ${s.name} ${s.width}px: ${s.findings.length} findings${s.stillLoading?' (still loading)':''}\n${s.findings.map(f=>`  - ${f.type}: ${f.selector||f.message}`).join('\n')}`);
 await writeFile(`${opts.out}/report.md`,'# UX capture report\n\n'+lines.join('\n')+'\n');if(opts.baseline)console.log(lines.join('\n'));else console.log(`Captured ${report.screens.length} screens in ${opts.out}`);
} catch(e){console.error(e.message);process.exitCode=1;} finally {await browser?.close();}
