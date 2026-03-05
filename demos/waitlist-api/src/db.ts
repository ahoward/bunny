import { Database } from 'bun:sqlite';

let _db: Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS waitlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL DEFAULT '',
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  waitlist_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting',
  email_verified INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  promoted_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (waitlist_id) REFERENCES waitlists(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_waitlist_email ON entries(waitlist_id, email);
CREATE INDEX IF NOT EXISTS idx_entries_waitlist_status_score ON entries(waitlist_id, status, score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_entries_referred_by ON entries(referred_by);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  waitlist_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  webhook_status TEXT NOT NULL DEFAULT 'skipped',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (waitlist_id) REFERENCES waitlists(id),
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);
`;

export function open_db(path?: string): Database {
  const db = new Database(path ?? ':memory:');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  _db = db;
  return db;
}

export function get_db(): Database {
  if (!_db) throw new Error('Database not initialized. Call open_db() first.');
  return _db;
}
