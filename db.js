import { DatabaseSync } from 'node:sqlite';

export function openDb(path = process.env.LINKBOX_DB || 'linkbox.db') {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  return {
    list: () => db.prepare('SELECT id, url, title, created_at FROM links ORDER BY id DESC').all(),
    add: (url, title) => {
      const r = db.prepare('INSERT INTO links (url, title) VALUES (?, ?)').run(url, title);
      return db.prepare('SELECT id, url, title, created_at FROM links WHERE id = ?').get(r.lastInsertRowid);
    },
    remove: (id) => db.prepare('DELETE FROM links WHERE id = ?').run(id).changes > 0,
  };
}
