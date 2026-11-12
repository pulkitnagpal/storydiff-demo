import { DatabaseSync } from 'node:sqlite';

const COLS = 'id, url, title, starred, created_at';

export function openDb(path = process.env.LINKBOX_DB || 'linkbox.db') {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    starred INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  // Migrate databases created before starring existed.
  const hasStarred = db.prepare('PRAGMA table_info(links)').all().some(c => c.name === 'starred');
  if (!hasStarred) db.exec('ALTER TABLE links ADD COLUMN starred INTEGER NOT NULL DEFAULT 0');

  const get = (id) => {
    const row = db.prepare(`SELECT ${COLS} FROM links WHERE id = ?`).get(id);
    return row && { ...row, starred: !!row.starred };
  };
  return {
    list: () => db.prepare(`SELECT ${COLS} FROM links ORDER BY id DESC`).all()
      .map(r => ({ ...r, starred: !!r.starred })),
    add: (url, title) => {
      const r = db.prepare('INSERT INTO links (url, title) VALUES (?, ?)').run(url, title);
      return get(r.lastInsertRowid);
    },
    setStarred: (id, starred) =>
      db.prepare('UPDATE links SET starred = ? WHERE id = ?').run(starred ? 1 : 0, id).changes > 0 ? get(id) : null,
    remove: (id) => db.prepare('DELETE FROM links WHERE id = ?').run(id).changes > 0,
  };
}
