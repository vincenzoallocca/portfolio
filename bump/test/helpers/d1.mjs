// D1 minimale su node:sqlite con lo schema reale di migrations/. Con un percorso file
// il database sopravvive a chiusura e riapertura (test di persistenza dopo un riavvio).
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const MIGRATIONS = new URL('../../migrations/', import.meta.url);

class Stmt {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }
  bind(...values) {
    return new Stmt(this.db, this.sql, values);
  }
  args() {
    return this.params.map((v) => (v === undefined ? null : v));
  }
  async first(col) {
    const row = this.db.prepare(this.sql).get(...this.args());
    if (!row) return null;
    return col ? row[col] : { ...row };
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.args());
    return { success: true, meta: { changes: Number(r.changes) } };
  }
}

export function createD1(path = ':memory:') {
  const db = new DatabaseSync(path);
  for (const f of readdirSync(MIGRATIONS).filter((n) => n.endsWith('.sql')).sort()) {
    db.exec(readFileSync(new URL(f, MIGRATIONS), 'utf8'));
  }
  return { raw: db, prepare: (sql) => new Stmt(db, sql), close: () => db.close() };
}
