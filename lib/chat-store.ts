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
