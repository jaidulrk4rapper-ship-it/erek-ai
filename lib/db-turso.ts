import { createClient } from "@libsql/client"

const url = process.env.TURSO_DATABASE_URL!
const authToken = process.env.TURSO_AUTH_TOKEN!

let client: ReturnType<typeof createClient> | null = null
let schemaDone = false

export function getTursoClient() {
  if (!url || !authToken) throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required")
  if (!client) client = createClient({ url, authToken })
  return client
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  created_at INTEGER,
  title TEXT,
  pinned INTEGER DEFAULT 0
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

CREATE INDEX IF NOT EXISTS idx_session_time ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`

export async function ensureTursoSchema() {
  if (schemaDone) return
  const c = getTursoClient()
  const statements = SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)
  for (const sql of statements) {
    if (sql) await c.execute({ sql })
  }
  schemaDone = true
}

export type DbRunner = {
  run(sql: string, ...args: (string | number | null)[]): Promise<void>
  get<T>(sql: string, ...args: (string | number | null)[]): Promise<T | undefined>
  all<T>(sql: string, ...args: (string | number | null)[]): Promise<T[]>
  /** Run multiple statements atomically (batch on Turso, transaction on SQLite). */
  runInTransaction(ops: { sql: string; args?: (string | number | null)[] }[]): Promise<void>
}

type InArgs = Array<string | number | null>

export async function getTursoDb(): Promise<DbRunner> {
  await ensureTursoSchema()
  const c = getTursoClient()
  return {
    async run(sql: string, ...args: (string | number | null)[]) {
      const a: InArgs | undefined = args.length ? args : undefined
      await c.execute(sql, a)
    },
    async get<T>(sql: string, ...args: (string | number | null)[]): Promise<T | undefined> {
      const a: InArgs | undefined = args.length ? args : undefined
      const rs = await c.execute(sql, a)
      const row = rs.rows[0]
      return row as T | undefined
    },
    async all<T>(sql: string, ...args: (string | number | null)[]): Promise<T[]> {
      const a: InArgs | undefined = args.length ? args : undefined
      const rs = await c.execute(sql, a)
      return rs.rows as T[]
    },
    async runInTransaction(ops: { sql: string; args?: (string | number | null)[] }[]) {
      if (ops.length === 0) return
      await c.batch(
        ops.map((o) => ({ sql: o.sql, args: (o.args ?? []) as InArgs }))
      )
    },
  }
}
