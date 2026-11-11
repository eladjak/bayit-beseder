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
    for (const p_action of ['complete','undo']) assert.equal((await post('/rest/v1/rpc/transition_task_completion', {p_action, p_task_id:'task-2', p_completion_id:'new-completion'})).status, 200);
    assert.equal((await (await get('/__state')).json()).writes, initial + 2);
    assert.equal(await new Promise((resolve, reject) => { http.get(base + '/__state', {headers:{host:'evil.example'}}, res => { res.resume(); resolve(res.statusCode); }).on('error', reject); }), 403);
    assert.equal((await post('/__reset', {})).status, 200);
    assert.equal((await (await get('/__state')).json()).writes, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
  assert.deepEqual((await readdir(process.cwd())).sort(), before);
});


test('review regressions', async t => {
  const server = createMock();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path, opts) => fetch(base + path, opts);
  const post = (path, body, headers={}) => get(path, {method:'POST', headers:{'content-type':'application/json', ...headers}, body:JSON.stringify(body)});
  const json = async path => (await get(path)).json();
  try {
    await t.test('range, inequality, negation, or and unsupported filters', async () => {
      assert.equal((await json('/rest/v1/meal_plan?plan_date=gte.2000-01-01&plan_date=lte.2999-01-01')).length, 7);
      assert.equal((await json('/rest/v1/tasks?status=neq.completed')).length, 4);
      assert.equal((await json('/rest/v1/meal_plan?meal_id=not.is.null')).length, 7);
      assert.equal((await json('/rest/v1/tasks?or=(status.eq.completed,status.eq.pending)')).length, 6);
      assert.equal((await get('/rest/v1/tasks?status=like.foo')).status, 400);
    });
    await t.test('RPC validation, idempotency and own undo', async () => {
      const rpc = body => post('/rest/v1/rpc/transition_task_completion', body);
      assert.equal((await rpc({p_action:'complete',p_task_id:'task-2'})).status, 400);
      assert.equal((await rpc({p_action:'complete',p_task_id:'task-0',p_completion_id:'another'})).status, 200);
      assert.equal((await json('/rest/v1/task_completions?task_id=eq.task-0')).length, 1);
      await post('/rest/v1/task_completions', {id:'partner',task_id:'task-2',user_id:'partner'});
      assert.equal((await rpc({p_action:'undo',p_task_id:'task-2'})).status, 200);
      assert.equal((await json('/rest/v1/task_completions?id=eq.partner')).length, 1);
    });
    await t.test('embedded select', async () => {
      const rows = await json('/rest/v1/tasks?select=*,category:task_categories(*)');
      assert.equal(rows[0].category.id, rows[0].category_id);
    });
    await t.test('scenario typo rejected', async () => assert.equal((await post('/__scenario',{name:'error:taks'})).status, 400));
    await t.test('untrusted browser origin rejected', async () => assert.equal((await post('/__reset',{}, {origin:'https://evil.example'})).status, 403));
    await t.test('meal plan upsert on conflict', async () => {
      const res = await post('/rest/v1/meal_plan?on_conflict=household_id,plan_date&columns=%22household_id%22,%22plan_date%22,%22meal_id%22', {household_id:'new-home',plan_date:'2026-11-11',meal_id:'meal-0'}, {prefer:'resolution=merge-duplicates,return=representation'});
      assert.equal(res.status, 201);
      await post('/rest/v1/meal_plan?on_conflict=household_id,plan_date&columns=%22household_id%22,%22plan_date%22,%22meal_id%22', {household_id:'new-home',plan_date:'2026-11-11',meal_id:'meal-1'}, {prefer:'resolution=merge-duplicates'});
      const rows = await json('/rest/v1/meal_plan?household_id=eq.new-home');
      assert.equal(rows.length, 1); assert.equal(rows[0].meal_id, 'meal-1');
    });
    await t.test('insert status and representation', async () => {
      assert.equal((await post('/rest/v1/tasks',{title:'new'})).status, 201);
      const res = await post('/rest/v1/tasks',{title:'represented'}, {prefer:'return=representation'});
      assert.equal(res.status, 201); assert.equal((await res.json())[0].title, 'represented');
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
