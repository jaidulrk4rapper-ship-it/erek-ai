import type { DbRunner } from "./db-turso"

const useTurso = !!process.env.TURSO_DATABASE_URL

let cachedTurso: Promise<DbRunner> | null = null

export async function getDb(): Promise<DbRunner> {
  if (useTurso) {
    const { getTursoDb } = await import("./db-turso")
    if (!cachedTurso) cachedTurso = getTursoDb()
    return cachedTurso
  }

  const Database = require("better-sqlite3") as typeof import("better-sqlite3")
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const dataDir = path.join(process.cwd(), "data")
  fs.mkdirSync(dataDir, { recursive: true })
  const dbPath = path.join(dataDir, "erek.db")
  const db = new Database(dbPath)

  db.exec(`
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  role TEXT,
  content TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  salt TEXT,
  provider TEXT DEFAULT 'credentials',
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_session_time
ON chat_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);
`)
  try {
    db.exec(`ALTER TABLE chat_sessions ADD COLUMN title TEXT`)
  } catch {}
  try {
    db.exec(`ALTER TABLE chat_sessions ADD COLUMN pinned INTEGER DEFAULT 0`)
  } catch {}

  const runner: DbRunner = {
    run(sql: string, ...args: (string | number | null)[]) {
      db.prepare(sql).run(...args)
      return Promise.resolve()
    },
    get<T>(sql: string, ...args: (string | number | null)[]) {
      return Promise.resolve(db.prepare(sql).get(...args) as T | undefined)
    },
    all<T>(sql: string, ...args: (string | number | null)[]) {
      return Promise.resolve(db.prepare(sql).all(...args) as T[])
    },
  }
  return runner
}
