import crypto from "crypto"
import { getDb } from "./db"

export async function ensureSession(userId: string, sessionId?: string): Promise<string> {
  if (!sessionId) return createSession(userId)
  const db = await getDb()
  const row = await db.get<{ id: string }>(
    `SELECT id FROM chat_sessions WHERE id=? AND user_id=?`,
    sessionId, userId
  )
  if (row) return sessionId
  return createSession(userId)
}

export async function createSession(userId: string): Promise<string> {
  const id = crypto.randomUUID()
  const db = await getDb()
  await db.run(
    `INSERT INTO chat_sessions (id, user_id, created_at, title, pinned) VALUES (?, ?, ?, NULL, 0)`,
    id,
    userId,
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
  userId: string,
  limit = 50
): Promise<{ id: string; created_at: number }[]> {
  const db = await getDb()
  const rows = await db.all<{ id: string; created_at: number }>(
    `SELECT id, created_at FROM chat_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT ?`,
    userId, limit
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
  userId: string,
  limit = 50
): Promise<{ id: string; created_at: number; title: string; pinned: boolean }[]> {
  const db = await getDb()
  const rows = await db.all<SessionRow>(
    `SELECT s.id, s.created_at, s.title AS custom_title, s.pinned,
      (SELECT content FROM chat_messages
       WHERE session_id = s.id AND role = 'user'
       ORDER BY created_at ASC LIMIT 1) AS first_user_message
    FROM chat_sessions s
    WHERE s.user_id = ?
    ORDER BY s.pinned DESC, s.created_at DESC
    LIMIT ?`,
    userId, limit
  )
  const titleMaxLen = 42
  return rows.map((r) => {
    const raw = (r.custom_title?.trim() || r.first_user_message?.trim() || "").trim()
    const title = raw.length > titleMaxLen ? raw.slice(0, titleMaxLen) + "\u2026" : raw || "New chat"
    return { id: r.id, created_at: r.created_at, title, pinned: !!r.pinned }
  })
}

export async function verifySessionOwner(sessionId: string, userId: string): Promise<boolean> {
  const db = await getDb()
  const row = await db.get<{ id: string }>(
    `SELECT id FROM chat_sessions WHERE id=? AND user_id=?`,
    sessionId, userId
  )
  return !!row
}

export async function updateSessionTitle(
  sessionId: string,
  userId: string,
  title: string
): Promise<void> {
  const db = await getDb()
  await db.run(`UPDATE chat_sessions SET title = ? WHERE id = ? AND user_id = ?`, title.trim().slice(0, 500), sessionId, userId)
}

export async function setSessionPinned(
  sessionId: string,
  userId: string,
  pinned: boolean
): Promise<void> {
  const db = await getDb()
  await db.run(`UPDATE chat_sessions SET pinned = ? WHERE id = ? AND user_id = ?`, pinned ? 1 : 0, sessionId, userId)
}

export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  const db = await getDb()
  const owner = await verifySessionOwner(sessionId, userId)
  if (!owner) return
  await db.runInTransaction([
    { sql: `DELETE FROM chat_messages WHERE session_id = ?`, args: [sessionId] },
    { sql: `DELETE FROM chat_sessions WHERE id = ? AND user_id = ?`, args: [sessionId, userId] },
  ])
}

export async function deleteSessionAdmin(sessionId: string): Promise<void> {
  const db = await getDb()
  await db.run(`DELETE FROM chat_messages WHERE session_id = ?`, sessionId)
  await db.run(`DELETE FROM chat_sessions WHERE id = ?`, sessionId)
}

export async function getAllSessionsWithTitle(
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
    const title = raw.length > titleMaxLen ? raw.slice(0, titleMaxLen) + "\u2026" : raw || "New chat"
    return { id: r.id, created_at: r.created_at, title, pinned: !!r.pinned }
  })
}
