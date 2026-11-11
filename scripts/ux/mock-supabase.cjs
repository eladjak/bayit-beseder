/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { user, fixtures } = require('./fixtures.cjs');
function createMock() {
  let scenario = 'normal', data = fixtures(), writes = 0;
  const sessions = new Map(), revoked = new Set();
  const partnerUser = {...user, id:'00000000-0000-4000-8000-000000000003', email:'partner@example.invalid'};
  const memberUser = {...user, email:'member@example.invalid'};
  const reset = name => { scenario = name; data = fixtures(name); writes = 0; };
  const send = (res, status, body, headers={}) => {res.writeHead(status, {'Content-Type':'application/json', ...headers}); res.end(JSON.stringify(body));};
  const error = (res, code, message) => send(res, code, {code:'MOCK_ERROR',message,details:null,hint:null});
  return http.createServer(async (req,res) => {
    if (!/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i.test(req.headers.host || '')) return error(res,403,'Loopback Host required');
    const origin = req.headers.origin;
    if (origin && !/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin)) return error(res,403,'Loopback Origin required');
    if (origin) res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Access-Control-Allow-Headers','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {res.writeHead(204); return res.end();}
    const url = new URL(req.url,'http://127.0.0.1');
    let body = '';
    for await (const chunk of req) {body += chunk; if (body.length > 1000000) return error(res,413,'Body too large');}
    try { body = body ? JSON.parse(body) : {}; } catch { return error(res,400,'Invalid JSON'); }
    if (url.pathname === '/__state' && req.method === 'GET') return send(res,200,{scenario,writes});
    if (url.pathname === '/__reset' && req.method === 'POST') {reset('normal'); return send(res,200,{scenario,writes});}
    if (url.pathname === '/__scenario' && req.method === 'POST') {
      if (typeof body.name !== 'string' || !/^(normal|empty|no-household|first-run|error:[a-z_]+|rpc-error:[a-z_]+|slow:\d+)$/.test(body.name)) return error(res,400,'Unknown scenario');
      if (body.name.startsWith('error:') && !Object.hasOwn(data,body.name.slice(6))) return error(res,400,'Unknown table');
      if (body.name.startsWith('rpc-error:') && body.name !== 'rpc-error:transition_task_completion') return error(res,400,'Unknown RPC');
      reset(body.name); return send(res,200,{scenario,writes});
    }
    if (scenario.startsWith('slow:')) await new Promise(resolve=>setTimeout(resolve,Math.min(Number(scenario.slice(5)),30000)));
    const token = (req.headers.authorization || '').replace(/^Bearer /i,'');
    if (url.pathname === '/auth/v1/token' && req.method === 'POST' && url.searchParams.get('grant_type') === 'password') {
      const person = body.email === memberUser.email ? memberUser : body.email === partnerUser.email ? partnerUser : null;
      if (!person || body.password !== 'fake-password') return error(res,400,'Invalid credentials');
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const access_token = `${encode({alg:'none',typ:'JWT'})}.${encode({sub:person.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',nonce:randomUUID()})}.fake`;
      sessions.set(access_token,person);
      return send(res,200,{access_token,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:randomUUID(),user:person});
    }
    if (url.pathname === '/auth/v1/logout' && req.method === 'POST') { sessions.delete(token); revoked.add(token); res.writeHead(204); return res.end(); }
    if (url.pathname === '/auth/v1/user' && req.method === 'GET') return revoked.has(token) ? error(res,401,'Session ended') : send(res,200,sessions.get(token) || user);
    const actor = sessions.get(token) || user;
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (rpc) {
      if (scenario === `rpc-error:${rpc[1]}`) return error(res,500,'Simulated RPC failure');
      if (rpc[1] !== 'transition_task_completion' || req.method !== 'POST') return error(res,404,'Unknown RPC');
      const task = data.tasks.find(x=>x.id === body.p_task_id);
      if (!task || !['complete','undo'].includes(body.p_action)) return error(res,400,'Invalid task or action');
      let row;
      const recurring = ['true','t','1','yes'].includes(String(task.recurring).trim().toLowerCase());
      const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date());
      const current = x => !recurring || new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date(x.completed_at)) === today;
      if (body.p_action === 'complete') {
        if (!body.p_completion_id) return error(res,400,'Completion id required');
        row = data.task_completions.find(x=>x.id===body.p_completion_id);
        if (row && (row.task_id!==task.id || row.user_id!==actor.id)) return error(res,403,'Completion id already used');
        if (!row && task.status==='skipped') return error(res,400,'Task is skipped');
        if (!row && (recurring || task.status==='completed')) row = data.task_completions.filter(x=>x.task_id===task.id && current(x)).sort((a,b)=>String(b.completed_at).localeCompare(String(a.completed_at)))[0];
        if (!row && !recurring && task.status==='completed') return error(res,400,'Task already completed without a completion record');
        if (!row) {row={id:body.p_completion_id,task_id:task.id,household_id:task.household_id,user_id:actor.id,completed_by:actor.id,completed_at:new Date().toISOString(),photo_url:body.p_photo_url || null,notes:body.p_notes || null}; data.task_completions.push(row); if (!recurring) task.status='completed'; writes++;}
      } else {
        row = data.task_completions.filter(x=>x.task_id===task.id && x.user_id===actor.id && current(x)).sort((a,b)=>String(b.completed_at).localeCompare(String(a.completed_at)))[0];
        if (!row && !recurring && task.status!=='pending') return error(res,403,'No own completion to undo');
        if (row) {data.task_completions=data.task_completions.filter(x=>x!==row); if (!recurring) task.status='pending'; writes++;}
        else row={task_id:task.id,user_id:actor.id};
      }
      return send(res,200,(req.headers.accept || '').includes('vnd.pgrst.object')?row:[row]);
    }
    const match = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (!match || !Object.hasOwn(data,match[1])) return error(res,404,'Unknown table');
    const table = match[1]; if (scenario === `error:${table}`) return error(res,500,'Simulated table failure');
    const filters = [...url.searchParams].filter(([k])=>!['select','order','limit','offset','on_conflict','columns'].includes(k));
    const compile = (key,value) => {
      if (key === 'or') {
        if (!/^\([^()]+\)$/.test(value)) throw Error('Unsupported or expression');
        const predicates = value.slice(1,-1).split(',').map(term=>{const dot=term.indexOf('.'); if(dot<1) throw Error('Invalid or expression'); return compile(term.slice(0,dot),term.slice(dot+1));});
        return row=>predicates.some(fn=>fn(row));
      }
      let negate=false; if(value.startsWith('not.')) {negate=true; value=value.slice(4);}
      const dot=value.indexOf('.'), op=value.slice(0,dot), v=value.slice(dot+1);
      if(dot<1 || !['eq','neq','is','in','gt','gte','lt','lte'].includes(op)) throw Error('Unsupported filter operator');
      if(op==='in' && !/^\(.*\)$/.test(v)) throw Error('Invalid in filter');
      const predicate = row=>{const val=row[key]; if (op==='is') return v==='null' ? val==null : String(val)===v; if(val==null) return false; const actual=String(val); if(op==='eq') return actual===v; if(op==='neq') return actual!==v; if(op==='in') return v.slice(1,-1).split(',').map(x=>x.replace(/^"|"$/g,'')).includes(actual); const cmp=actual.localeCompare(v, 'en', {numeric:true}); return op==='gt'?cmp>0:op==='gte'?cmp>=0:op==='lt'?cmp<0:cmp<=0;};
      return row=>negate ? !predicate(row) : predicate(row);
    };
    let predicates; try { predicates=filters.map(([key,value])=>compile(key,value)); } catch(e) {return error(res,400,e.message);}
    const matches = row => predicates.every(fn=>fn(row));
    let rows = data[table].filter(matches);
    if (req.method === 'POST') {
      const conflict=url.searchParams.get('on_conflict');
      const merge=(req.headers.prefer || '').includes('resolution=merge-duplicates');
      if(conflict && !merge) return error(res,400,'Unsupported conflict resolution');
      const keys=conflict ? conflict.split(',') : [];
      rows=(Array.isArray(body)?body:[body]).map(x=>{
        const existing=keys.length && data[table].find(row=>keys.every(key=>row[key]===x[key]));
        if(existing) {Object.assign(existing,x); return existing;}
        const row={id:randomUUID(),...x}; data[table].push(row); return row;
      }); writes++;
    }
    else if (req.method === 'PATCH') {rows.forEach(row=>Object.assign(row,body)); writes++;}
    else if (req.method === 'DELETE') {data[table]=data[table].filter(row=>!matches(row)); writes++;}
    else if (req.method !== 'GET' && req.method !== 'HEAD') return error(res,405,'Unsupported method');
    const order=url.searchParams.get('order'); if(order) {const [key,dir]=order.split('.'); rows.sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(dir==='desc'?-1:1));}
    const offset=Number(url.searchParams.get('offset') || 0), limit=Number(url.searchParams.get('limit') || rows.length); rows=rows.slice(offset,offset+limit);
    const select=url.searchParams.get('select');
    if(select && select!=='*') {
      const embed=select.match(/^(?:\*,)?([a-z_]+):([a-z_]+)\(\*\)$/);
      if(embed) {
        const [,alias,related]=embed;
        const relations={'tasks:task_categories':'category_id','meal_plan:meals':'meal_id'};
        const foreign=relations[`${table}:${related}`];
        if(!foreign) return error(res,400,'Unsupported embedded relation');
        rows=rows.map(row=>({...row,[alias]:data[related].find(item=>item.id===row[foreign]) || null}));
      } else if(select.includes('(')) return error(res,400,'Unsupported embedded select');
      else {const cols=select.split(',').map(x=>x.trim()); rows=rows.map(row=>Object.fromEntries(cols.map(col=>[col,row[col]])));}
    }
    const single=(req.headers.accept || '').includes('vnd.pgrst.object');
    if(single && rows.length!==1) return error(res,406,'Expected one row');
    if(req.method==='POST' && !(req.headers.prefer || '').includes('return=representation')) {res.writeHead(201); return res.end();}
    return send(res,req.method==='POST'?201:200,single?rows[0]:rows,{'Content-Range':`0-${Math.max(rows.length-1,0)}/${rows.length}`});
  });
}
if (require.main === module) { const port=Number(process.env.PORT || process.argv[2] || 54329); createMock().listen(port,'127.0.0.1',()=>console.log(`Mock Supabase listening on 127.0.0.1:${port}`)); }
module.exports = { createMock };
