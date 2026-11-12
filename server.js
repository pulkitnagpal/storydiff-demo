import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { openDb } from './db.js';

export function makeServer(db = openDb()) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(readFileSync(new URL('./public/index.html', import.meta.url)));
    }
    if (req.method === 'GET' && url.pathname === '/api/links') return send(200, db.list());
    if (req.method === 'POST' && url.pathname === '/api/links') {
      let raw = ''; for await (const c of req) raw += c;
      let body; try { body = JSON.parse(raw); } catch { return send(400, { error: 'invalid json' }); }
      if (!body.url) return send(400, { error: 'url is required' });
      return send(201, db.add(body.url, body.title || body.url));
    }
    const m = url.pathname.match(/^\/api\/links\/(\d+)$/);
    if (req.method === 'PATCH' && m) {
      let raw = ''; for await (const c of req) raw += c;
      let body; try { body = JSON.parse(raw); } catch { return send(400, { error: 'invalid json' }); }
      if (typeof body.starred !== 'boolean') return send(400, { error: 'starred must be a boolean' });
      const link = db.setStarred(Number(m[1]), body.starred);
      return link ? send(200, link) : send(404, { error: 'not found' });
    }
    if (req.method === 'DELETE' && m) return db.remove(Number(m[1])) ? send(204, {}) : send(404, { error: 'not found' });
    send(404, { error: 'not found' });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  makeServer().listen(port, () => console.log(`linkbox on http://localhost:${port}`));
}
