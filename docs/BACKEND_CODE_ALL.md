# EreK — Sab backend code (ek jagah)

Yeh doc project ke saare backend files ka code hai: API routes + lib.

---

## 1. app/api/chat/route.ts

```ts
import { NextResponse } from "next/server"
import { formatErekResponse } from "@/lib/response-formatter"
import { parseNextStepsFromMessage } from "@/lib/next-steps"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const message = String(body?.message ?? body?.prompt ?? "").trim()
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    const raw = process.env.OLLAMA_URL
    if (!raw && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "OLLAMA_URL_not_configured" },
        { status: 500 }
      )
    }
    const baseUrl = (raw ?? "http://127.0.0.1:11434").replace(/\/$/, "")
    const url = `${baseUrl}/api/generate`

    const prompt = `${SYSTEM_PROMPT}\n\nUser: ${message}\n\nAssistant:`

    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 60_000)

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
      signal: ac.signal,
    }).finally(() => clearTimeout(t))

    if (!r.ok) {
      const text = await r.text().catch(() => "")
      return NextResponse.json(
        { error: "ollama_http_error", status: r.status, detail: text.slice(0, 500) },
        { status: 502 }
      )
    }

    const data = await r.json()
    const rawText = data?.response ?? ""
    const parsedNextSteps = parseNextStepsFromMessage(rawText)
    const text = formatErekResponse(rawText, { userMessage: message })
    const nextSteps =
      parsedNextSteps.length >= 2 ? parsedNextSteps.slice(0, 4) : undefined
    return NextResponse.json({ text, nextSteps })
  } catch (e: unknown) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "ollama_timeout"
        : e instanceof Error
          ? String(e.message)
          : "ollama_fetch_failed"
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
```

---

## 2. app/api/chat/stream/route.ts

```ts
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const message = String(body?.message ?? body?.prompt ?? "").trim()
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  const baseUrl = (process.env.OLLAMA_URL ?? "").replace(/\/$/, "")
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL,
      prompt: message,
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text()
    return NextResponse.json({ error: text || "Ollama stream failed" }, { status: res.status || 500 })
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
```

---

## 3. app/api/ollama/route.ts

```ts
import { NextResponse } from "next/server"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const runtime = "nodejs"

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) })
     .catch((e) => { clearTimeout(t); reject(e) })
  })
}

export async function POST(req: Request) {
  const OLLAMA_URL = process.env.OLLAMA_URL
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 20000)

  if (!OLLAMA_URL || !OLLAMA_MODEL) {
    return NextResponse.json({ error: "OLLAMA_URL or OLLAMA_MODEL missing" }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const message = String(body.message ?? body.prompt ?? "").trim()

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  const prompt = `${SYSTEM_PROMPT}\nuser: ${message}\nassistant:`

  try {
    const res = await withTimeout(
      fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
      }),
      timeoutMs
    )

    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return NextResponse.json({ error: `ollama_http_${res.status}`, detail: txt }, { status: 502 })
    }

    const data = await res.json()

    return NextResponse.json({
      role: "assistant",
      content: data.response,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "ollama_failed", detail: e instanceof Error ? e.message : "Stream error" },
      { status: 502 }
    )
  }
}
```

---

## 4. app/api/sessions/route.ts

```ts
import { NextResponse } from "next/server"
import { getSessionsWithTitle } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    const sessions = await getSessionsWithTitle(50)
    return NextResponse.json({ sessions })
  } catch (e) {
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 })
  }
}
```

---

## 5. app/api/sessions/[id]/route.ts

```ts
import { NextResponse } from "next/server"
import {
  updateSessionTitle,
  setSessionPinned,
  deleteSession,
} from "@/lib/chat-store"

export const runtime = "nodejs"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    const body = await _req.json().catch(() => ({}))
    if (typeof body.title === "string") await updateSessionTitle(id, body.title)
    if (typeof body.pinned === "boolean") await setSessionPinned(id, body.pinned)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    await deleteSession(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
```

---

## 6. app/api/sessions/[id]/messages/route.ts

```ts
import { NextResponse } from "next/server"
import { getMessages } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    const messages = await getMessages(id)
    return NextResponse.json({ messages })
  } catch (e) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  }
}
```

---

## 7. app/api/admin/sessions/route.ts

```ts
import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getSessionsWithTitle } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function GET(req: Request) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const sessions = await getSessionsWithTitle(50)
    return NextResponse.json({ sessions })
  } catch (e) {
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 })
  }
}
```

---

## 8. app/api/admin/session/[id]/route.ts

```ts
import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { deleteSession } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    await deleteSession(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
```

---

## 9. app/api/admin/session/[id]/messages/route.ts

```ts
import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getMessages } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    const messages = await getMessages(id, 200)
    return NextResponse.json({ messages })
  } catch (e) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  }
}
```

---

## 10. lib/db.ts

```ts
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

CREATE INDEX IF NOT EXISTS idx_session_time
ON chat_messages(session_id, created_at);
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
```

---

## 11. lib/db-turso.ts

```ts
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
```

---

## 12. lib/chat-store.ts

```ts
import crypto from "crypto"
import { getDb } from "./db"

export async function ensureSession(sessionId?: string): Promise<string> {
  if (!sessionId) return createSession()
  const db = await getDb()
  const row = await db.get<{ id: string }>(`SELECT id FROM chat_sessions WHERE id=?`, sessionId)
  if (row) return sessionId
  return createSession()
}

export async function createSession(): Promise<string> {
  const id = crypto.randomUUID()
  const db = await getDb()
  await db.run(
    `INSERT INTO chat_sessions (id, created_at, title, pinned) VALUES (?, ?, NULL, 0)`,
    id,
    Date.now()
  )
  return id
}

export async function addMessage(
  sessionId: string,
  role: string,
  content: string
): Promise<void> {
  const db = await getDb()
  await db.run(`INSERT INTO chat_messages VALUES (?, ?, ?, ?, ?)`, crypto.randomUUID(), sessionId, role, content, Date.now())
}

export async function getRecentMessages(
  sessionId: string,
  limit = 12
): Promise<{ role: string; content: string }[]> {
  const db = await getDb()
  const rows = await db.all<{ role: string; content: string }>(
    `SELECT role, content FROM chat_messages WHERE session_id=? ORDER BY created_at DESC LIMIT ?`,
    sessionId,
    limit
  )
  return rows.reverse()
}

export async function getMessages(
  sessionId: string,
  limit = 200
): Promise<{ role: string; content: string }[]> {
  const db = await getDb()
  const rows = await db.all<{ role: string; content: string }>(
    `SELECT role, content FROM chat_messages WHERE session_id=? ORDER BY created_at ASC LIMIT ?`,
    sessionId,
    limit
  )
  return rows
}

export async function getSessions(
  limit = 50
): Promise<{ id: string; created_at: number }[]> {
  const db = await getDb()
  const rows = await db.all<{ id: string; created_at: number }>(
    `SELECT id, created_at FROM chat_sessions ORDER BY created_at DESC LIMIT ?`,
    limit
  )
  return rows
}

type SessionRow = {
  id: string
  created_at: number
  custom_title: string | null
  pinned: number
  first_user_message: string | null
}

export async function getSessionsWithTitle(
  limit = 50
): Promise<{ id: string; created_at: number; title: string; pinned: boolean }[]> {
  const db = await getDb()
  const rows = await db.all<SessionRow>(
    `SELECT s.id, s.created_at, s.title AS custom_title, s.pinned,
      (SELECT content FROM chat_messages
       WHERE session_id = s.id AND role = 'user'
       ORDER BY created_at ASC LIMIT 1) AS first_user_message
    FROM chat_sessions s
    ORDER BY s.pinned DESC, s.created_at DESC
    LIMIT ?`,
    limit
  )
  const titleMaxLen = 42
  return rows.map((r) => {
    const raw = (r.custom_title?.trim() || r.first_user_message?.trim() || "").trim()
    const title = raw.length > titleMaxLen ? raw.slice(0, titleMaxLen) + "…" : raw || "New chat"
    return { id: r.id, created_at: r.created_at, title, pinned: !!r.pinned }
  })
}

export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<void> {
  const db = await getDb()
  await db.run(`UPDATE chat_sessions SET title = ? WHERE id = ?`, title.trim().slice(0, 500), sessionId)
}

export async function setSessionPinned(
  sessionId: string,
  pinned: boolean
): Promise<void> {
  const db = await getDb()
  await db.run(`UPDATE chat_sessions SET pinned = ? WHERE id = ?`, pinned ? 1 : 0, sessionId)
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDb()
  await db.run(`DELETE FROM chat_messages WHERE session_id = ?`, sessionId)
  await db.run(`DELETE FROM chat_sessions WHERE id = ?`, sessionId)
}
```

---

## 13. lib/admin-auth.ts

```ts
export function checkAdminAuth(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${secret}`
}
```

---

## 14. lib/errors.ts

```ts
export class EreKError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public retryable: boolean,
    public detail?: string
  ) {
    super(userMessage)
    this.name = "EreKError"
  }
}

export function normalizeToEreKError(e: unknown): EreKError {
  if (e instanceof EreKError) return e
  const err = e as NodeJS.ErrnoException & { cause?: unknown }
  const msg = err?.message ?? String(e)
  const code = err?.code ?? ""

  if (code === "ECONNREFUSED" || msg.includes("ECONNREFUSED")) {
    return new EreKError(
      "ollama_unavailable",
      "Ollama is not running. Please start Ollama and try again.",
      true,
      msg
    )
  }
  if (code === "ETIMEDOUT" || code === "ABORT_ERR" || msg.includes("timeout") || msg.includes("abort")) {
    return new EreKError(
      "timeout",
      "Request timed out. Ollama or n8n may be slow or unreachable.",
      true,
      msg
    )
  }
  if (msg.includes("OLLAMA_URL") || msg.includes("OLLAMA_MODEL")) {
    return new EreKError(
      "config_missing",
      "Ollama is not configured. Set OLLAMA_URL and OLLAMA_MODEL in .env.local and restart.",
      false,
      msg
    )
  }
  if (msg.includes("ollama_http_")) {
    return new EreKError(
      "ollama_http_error",
      "Ollama is not responding. Is it running? (e.g. ollama run llama3.1)",
      true,
      msg
    )
  }

  return new EreKError("unknown", "Could not get a reply. Check that Ollama is running and .env.local is set.", false, msg)
}
```

---

## 15. lib/llm.ts

```ts
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1"

export async function chatWithOllama(messages: ChatMessage[]) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: { temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Ollama error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as { message?: { content?: string } }
  return data?.message?.content ?? ""
}
```

---

## 16. lib/memory.ts

```ts
import fs from "fs"

const FILE = "./memory.json"

export function loadMemory() {
  if (!fs.existsSync(FILE)) return []
  return JSON.parse(fs.readFileSync(FILE, "utf8"))
}

export function saveMemory(history: any[]) {
  fs.writeFileSync(FILE, JSON.stringify(history, null, 2))
}
```

---

## 17. lib/next-steps.ts

```ts
/**
 * Lightweight heuristics to generate 2–4 "Next step" suggestions from assistant message text.
 */
// (constants: CODE_SUGGESTIONS, TROUBLESHOOTING_SUGGESTIONS, PLANNING_SUGGESTIONS,
//  CREATIVE_SUGGESTIONS, DOCUMENT_SUGGESTIONS, DEFAULT_SUGGESTIONS)

// hasCode, isTroubleshooting, isPlanning, isCreative, isDocumentWorthy — regex helpers
// SMALL_TALK_USER_PATTERN — regex

export function shouldShowNextSteps(messageText: string, context?: { userMessage?: string }): boolean
export function parseNextStepsFromMessage(text: string): string[]
export function generateNextSteps(messageText: string, recentContext?: { userMessage?: string }): string[]
```
Full file: `lib/next-steps.ts`

---

## 18. lib/response-formatter.ts

```ts
import { shouldShowNextSteps } from "./next-steps"
// MAX_EMOJIS=2, MAX_BOLD_SEGMENTS=2, EMOJI_REGEX
// countEmojis, capEmojis, capBoldSegments
export type FormatErekContext = { userMessage?: string }
export function formatErekResponse(raw: string, context?: FormatErekContext): string
```
Full file: `lib/response-formatter.ts`

---

## 19. lib/system-prompt.ts

Exports single string `SYSTEM_PROMPT` — Erek persona, language/tone, next-step rules, ask-to-proceed. Full text: `lib/system-prompt.ts`

---

## 20. lib/thinking-delay.ts

```ts
/**
 * Minimum "thinking" time (ms) before Erek's reply is shown.
 */

const SMALL_TALK_PATTERN = /^(hi|hello|hey|bye|good\s*(morning|night|day)|gm|gn|how\s*are\s*you|what'?s\s*up|sup|good|ok(ay)?|thanks?|date|what'?s\s*the\s*date|namaste|kaise\s*ho)[\s!?.]*$/i

const BIG_WORK_PATTERN = /\b(project|build|create|develop|plan|debug|code|video|image|app|implement|design|write\s+(a|the)|make\s+(a|me)|help\s+me)\b/i

export function getThinkingDelayMs(message: string): number {
  const text = (message ?? "").trim()
  const len = text.length
  const lower = text.toLowerCase()

  if (len < 20 || SMALL_TALK_PATTERN.test(text)) return 400 + Math.random() * 400
  if (BIG_WORK_PATTERN.test(lower) || len > 200) return 2500 + Math.random() * 2500
  if (len > 100) return 1800 + Math.random() * 1200
  if (len > 50) return 1000 + Math.random() * 800

  return 700 + Math.random() * 500
}
```

---

**Summary:**  
- **API routes:** `app/api/chat`, `app/api/chat/stream`, `app/api/ollama`, `app/api/sessions/*`, `app/api/admin/*`.  
- **Lib:** `db`, `db-turso`, `chat-store`, `admin-auth`, `errors`, `llm`, `memory`, `next-steps`, `response-formatter`, `system-prompt`, `thinking-delay`.  

Exact full text of next-steps, response-formatter aur system-prompt repo ke files mein hai; upar paths diye hain.
