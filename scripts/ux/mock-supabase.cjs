/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { user, fixtures } = require('./fixtures.cjs');
function createMock() {
  let scenario = 'normal', data = fixtures(), writes = 0;
  const reset = name => { scenario = name; data = fixtures(name); writes = 0; };
  const send = (res, status, body, headers={}) => {res.writeHead(status, {'Content-Type':'application/json', ...headers}); res.end(JSON.stringify(body));};
  const error = (res, code, message) => send(res, code, {code:'MOCK_ERROR',message,details:null,hint:null});
  return http.createServer(async (req,res) => {
    if (!/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i.test(req.headers.host || '')) return error(res,403,'Loopback Host required');
    res.setHeader('Access-Control-Allow-Origin',req.headers.origin || '*');
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
      reset(body.name); return send(res,200,{scenario,writes});
    }
    if (scenario.startsWith('slow:')) await new Promise(resolve=>setTimeout(resolve,Math.min(Number(scenario.slice(5)),30000)));
    if (url.pathname === '/auth/v1/user' && req.method === 'GET') return send(res,200,user);
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (rpc) {
      if (scenario === `rpc-error:${rpc[1]}`) return error(res,500,'Simulated RPC failure');
      if (rpc[1] !== 'transition_task_completion' || req.method !== 'POST') return error(res,404,'Unknown RPC');
      const task = data.tasks.find(x=>x.id === body.p_task_id);
      if (!task || !['complete','undo'].includes(body.p_action)) return error(res,400,'Invalid task or action');
      let row;
      if (body.p_action === 'complete') {row={id:body.p_completion_id || randomUUID(),task_id:task.id,household_id:task.household_id,user_id:user.id,completed_by:user.id,completed_at:new Date().toISOString()}; data.task_completions.push(row); task.status='completed';}
      else {const index=data.task_completions.findIndex(x=>x.task_id===task.id); if(index<0) return error(res,404,'Completion missing'); [row]=data.task_completions.splice(index,1); task.status='pending';}
      writes++; return send(res,200,(req.headers.accept || '').includes('vnd.pgrst.object')?row:[row]);
    }
    const match = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (!match || !Object.hasOwn(data,match[1])) return error(res,404,'Unknown table');
    const table = match[1]; if (scenario === `error:${table}`) return error(res,500,'Simulated table failure');
    const filters = [...url.searchParams].filter(([k])=>!['select','order','limit','offset'].includes(k));
    const matches = row => filters.every(([key,value])=>{const [op,...parts]=value.split('.');const v=parts.join('.'); if(op==='eq') return String(row[key])===v; if(op==='is') return v==='null' ? row[key]==null : String(row[key])===v; if(op==='in') return v.slice(1,-1).split(',').map(x=>x.replace(/^"|"$/g,'')).includes(String(row[key])); return false;});
    let rows = data[table].filter(matches);
    if (req.method === 'POST') {rows=(Array.isArray(body)?body:[body]).map(x=>({id:randomUUID(),...x})); data[table].push(...rows); writes++;}
    else if (req.method === 'PATCH') {rows.forEach(row=>Object.assign(row,body)); writes++;}
    else if (req.method === 'DELETE') {data[table]=data[table].filter(row=>!matches(row)); writes++;}
    else if (req.method !== 'GET' && req.method !== 'HEAD') return error(res,405,'Unsupported method');
    const order=url.searchParams.get('order'); if(order) {const [key,dir]=order.split('.'); rows.sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(dir==='desc'?-1:1));}
    const offset=Number(url.searchParams.get('offset') || 0), limit=Number(url.searchParams.get('limit') || rows.length); rows=rows.slice(offset,offset+limit);
    const select=url.searchParams.get('select'); if(select && select!=='*' && !select.includes('(')) {const cols=select.split(',').map(x=>x.trim()); rows=rows.map(row=>Object.fromEntries(cols.map(col=>[col,row[col]])));}
    const single=(req.headers.accept || '').includes('vnd.pgrst.object');
    if(single && rows.length!==1) return error(res,406,'Expected one row');
    return send(res,200,single?rows[0]:rows,{'Content-Range':`0-${Math.max(rows.length-1,0)}/${rows.length}`});
  });
}
if (require.main === module) { const port=Number(process.env.PORT || process.argv[2] || 54329); createMock().listen(port,'127.0.0.1',()=>console.log(`Mock Supabase listening on 127.0.0.1:${port}`)); }
module.exports = { createMock };
