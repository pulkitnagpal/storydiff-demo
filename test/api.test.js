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

test('deletes a link', async () => {
  const s = await start();
  const made = await (await fetch(s.base + '/api/links', { method: 'POST', body: JSON.stringify({ url: 'https://b.dev' }) })).json();
  assert.equal((await fetch(s.base + '/api/links/' + made.id, { method: 'DELETE' })).status, 204);
  assert.equal((await (await fetch(s.base + '/api/links')).json()).length, 0);
  s.close();
});
