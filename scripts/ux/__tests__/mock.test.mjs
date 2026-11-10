import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import http from 'node:http';
const require = createRequire(import.meta.url);
const { createMock } = require('../mock-supabase.cjs');

test('scenarios, isolation, writes, filters and loopback security', async () => {
  const before = (await readdir(process.cwd())).sort();
  const server = createMock();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path, opts) => fetch(base + path, opts);
  const post = (path, body) => get(path, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)});
  try {
    for (const name of ['normal','empty','no-household','first-run','error:tasks','rpc-error:transition_task_completion','slow:5']) {
      assert.equal((await post('/__scenario', {name})).status, 200, name);
      assert.equal((await (await get('/__state')).json()).scenario, name);
      assert.equal((await get('/auth/v1/user')).status, 200);
    }
    await post('/__scenario', {name:'normal'});
    assert.equal((await (await get('/rest/v1/tasks')).json()).length, 6);
    assert.equal((await (await get('/rest/v1/shopping_items')).json()).length, 9);
    assert.equal((await (await get('/rest/v1/meal_plan')).json()).length, 7);
    await post('/__scenario', {name:'empty'});
    assert.deepEqual(await (await get('/rest/v1/tasks')).json(), []);
    await post('/__scenario', {name:'no-household'});
    assert.equal((await (await get('/rest/v1/profiles?id=eq.00000000-0000-4000-8000-000000000001')).json())[0].household_id, null);
    await post('/__scenario', {name:'first-run'});
    assert.deepEqual(await (await get('/rest/v1/shopping_items')).json(), []);
    await post('/__scenario', {name:'error:tasks'});
    assert.equal((await get('/rest/v1/tasks')).status, 500);
    assert.equal((await get('/rest/v1/shopping_items')).status, 200);
    await post('/__scenario', {name:'rpc-error:transition_task_completion'});
    assert.equal((await post('/rest/v1/rpc/transition_task_completion', {})).status, 500);
    assert.equal((await get('/rest/v1/tasks')).status, 200);
    await post('/__scenario', {name:'normal'});
    const tasks = await (await get('/rest/v1/tasks?select=id,title&limit=1')).json();
    assert.equal(tasks.length, 1); assert.deepEqual(Object.keys(tasks[0]).sort(), ['id','title']);
    const initial = (await (await get('/__state')).json()).writes;
    for (const p_action of ['complete','undo']) assert.equal((await post('/rest/v1/rpc/transition_task_completion', {p_action, p_task_id:tasks[0].id})).status, 200);
    assert.equal((await (await get('/__state')).json()).writes, initial + 2);
    assert.equal(await new Promise((resolve, reject) => { http.get(base + '/__state', {headers:{host:'evil.example'}}, res => { res.resume(); resolve(res.statusCode); }).on('error', reject); }), 403);
    assert.equal((await post('/__reset', {})).status, 200);
    assert.equal((await (await get('/__state')).json()).writes, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
  assert.deepEqual((await readdir(process.cwd())).sort(), before);
});
