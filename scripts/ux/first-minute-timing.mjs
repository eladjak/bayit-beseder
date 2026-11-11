// Local-only timing: the seed route is simulated because the fake has no privacy-consent table.
import { chromium } from 'playwright';
const base = process.env.BAYIT_UX_BASE || 'http://127.0.0.1:3119';
const fake = process.env.BAYIT_UX_FAKE || 'http://127.0.0.1:55483';
for (const value of [base, fake]) if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname)) throw new Error('Loopback only');
const uid='00000000-0000-4000-8000-000000000001', home='00000000-0000-4000-8000-000000000002';
await fetch(`${fake}/__scenario`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'first-run'})});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args:['--no-sandbox']});
try {
 const context=await browser.newContext({viewport:{width:375,height:800},timezoneId:'Asia/Jerusalem',locale:'he-IL'});
 const user={id:uid,aud:'authenticated',role:'authenticated',email:'demo@example.invalid',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const exp=Math.floor(Date.now()/1000)+86400, payload=Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp})).toString('base64url');
 const session={access_token:`e30.${payload}.fake`,refresh_token:'fake',expires_at:exp,expires_in:86400,token_type:'bearer',user};
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:base}]);
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) return route.abort();
  if(url.pathname.startsWith('/api/ai/')) return route.fulfill({status:503,json:{error:'disabled in local capture'}});
  if(url.pathname==='/api/privacy/consent') return route.fulfill({json:{accepted:true}});
  if(url.pathname==='/api/seed') {
   const body=route.request().postDataJSON();
   const rows=body.tasks.map((task)=>({household_id:home,title:task.title,status:'pending',recurring:task.recurring}));
   const response=await fetch(`${fake}/rest/v1/tasks`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(rows)});
   return route.fulfill({status:response.ok?200:500,json:{seeded:response.ok}});
  }
  return route.continue();
 });
 const page=await context.newPage(); await page.goto(`${base}/dashboard`);
 await page.getByRole('heading',{name:'מי גר כאן?'}).waitFor({timeout:60000});
 const start=performance.now();
 await page.waitForTimeout(1000);
 await page.getByRole('button',{name:'בזוג'}).click(); await page.waitForTimeout(1000);
 await page.getByRole('button',{name:'מכינים את הבית'}).click(); await page.waitForTimeout(1000);
 await page.getByRole('button',{name:'קדימה'}).click(); await page.waitForTimeout(2000);
 await page.getByRole('button',{name:'סיימתי'}).click();
 await page.getByRole('heading',{name:'צעד קטן, בית נעים יותר'}).waitFor({timeout:15000});
 const seconds=(performance.now()-start)/1000;
 const state=await fetch(`${fake}/__state`).then(r=>r.json());
 console.log(JSON.stringify({seconds, fakeWrites:state.writes, note:'Seed route simulated against in-memory fake; completion uses fake RPC.'}));
} finally { await browser.close(); }
