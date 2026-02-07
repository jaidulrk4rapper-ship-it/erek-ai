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

CREATE INDEX IF NOT EXISTS idx_session_time ON chat_messages(session_id, created_at);
`

export async function ensureTursoSchema() {
  if (schemaDone) return
  const c = getTursoClient()
  const statements = SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)
  for (const sql of statements) {
    if (sql) await c.execute(sql)
  }
  schemaDone = true
}

export type DbRunner = {
  run(sql: string, ...args: (string | number | null)[]): Promise<void>
  get<T>(sql: string, ...args: (string | number | null)[]): Promise<T | undefined>
  all<T>(sql: string, ...args: (string | number | null)[]): Promise<T[]>
}

export async function getTursoDb(): Promise<DbRunner> {
  await ensureTursoSchema()
  const c = getTursoClient()
  return {
    async run(sql: string, ...args: (string | number | null)[]) {
      await c.execute({ sql, args: args as any })
    },
    async get<T>(sql: string, ...args: (string | number | null)[]): Promise<T | undefined> {
      const rs = await c.execute({ sql, args: args as any })
      const row = rs.rows[0]
      return row as T | undefined
    },
    async all<T>(sql: string, ...args: (string | number | null)[]): Promise<T[]> {
      const rs = await c.execute({ sql, args: args as any })
      return rs.rows as T[]
    },
  }
}
