import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../server.js';
import { openDb } from '../db.js';

async function start() {
  const srv = makeServer(openDb(':memory:'));
  await new Promise(r => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}`;
  return { base, close: () => srv.close() };
}

test('adds and lists links', async () => {
  const s = await start();
  const r = await fetch(s.base + '/api/links', { method: 'POST', body: JSON.stringify({ url: 'https://a.dev', title: 'A' }) });
  assert.equal(r.status, 201);
  const list = await (await fetch(s.base + '/api/links')).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].title, 'A');
  s.close();
});

test('rejects a link without url', async () => {
  const s = await start();
  const r = await fetch(s.base + '/api/links', { method: 'POST', body: JSON.stringify({ title: 'x' }) });
  assert.equal(r.status, 400);
  s.close();
});

test('starring a link does not change the API list order (newest first)', async () => {
  const s = await start();
  const add = async (url) => (await (await fetch(s.base + '/api/links', { method: 'POST', body: JSON.stringify({ url }) })).json());
  const a = await add('https://a.dev'); await add('https://b.dev'); await add('https://c.dev');
  assert.equal(a.starred, false);
  const r = await fetch(s.base + '/api/links/' + a.id, { method: 'PATCH', body: JSON.stringify({ starred: true }) });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).starred, true);
  let list = await (await fetch(s.base + '/api/links')).json();
  assert.deepEqual(list.map(l => l.url), ['https://c.dev', 'https://b.dev', 'https://a.dev']);
  assert.deepEqual(list.map(l => l.starred), [false, false, true]);
  await fetch(s.base + '/api/links/' + a.id, { method: 'PATCH', body: JSON.stringify({ starred: false }) });
  list = await (await fetch(s.base + '/api/links')).json();
  assert.equal(list[2].starred, false);
  s.close();
});

test('starring validates input and missing links', async () => {
  const s = await start();
  assert.equal((await fetch(s.base + '/api/links/999', { method: 'PATCH', body: JSON.stringify({ starred: true }) })).status, 404);
  const made = await (await fetch(s.base + '/api/links', { method: 'POST', body: JSON.stringify({ url: 'https://x.dev' }) })).json();
  assert.equal((await fetch(s.base + '/api/links/' + made.id, { method: 'PATCH', body: JSON.stringify({ starred: 'yes' }) })).status, 400);
  s.close();
});

test('deletes a link', async () => {
  const s = await start();
  const made = await (await fetch(s.base + '/api/links', { method: 'POST', body: JSON.stringify({ url: 'https://b.dev' }) })).json();
  assert.equal((await fetch(s.base + '/api/links/' + made.id, { method: 'DELETE' })).status, 204);
  assert.equal((await (await fetch(s.base + '/api/links')).json()).length, 0);
  s.close();
});
