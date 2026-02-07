# EreK — Database (SQLite)

## File

- Path: `data/erek.db`
- Created automatically on first run (folder `data/` created if missing).

---

## Schema

**chat_sessions**

| Column     | Type    | Description        |
|------------|---------|--------------------|
| id         | TEXT    | UUID, primary key  |
| created_at | INTEGER | Unix timestamp     |

**chat_messages**

| Column     | Type    | Description        |
|------------|---------|--------------------|
| id         | TEXT    | UUID, primary key  |
| session_id | TEXT    | FK to chat_sessions |
| role       | TEXT    | `"user"` or `"assistant"` |
| content    | TEXT    | Message body       |
| created_at | INTEGER | Unix timestamp     |

**Index**

- `idx_session_time` on `chat_messages(session_id, created_at)` for fast recent-messages query.

---

## API (lib/chat-store.ts)

| Function | Description |
|----------|-------------|
| `ensureSession(sessionId?)` | Returns existing session id if valid, else creates new session and returns its id. |
| `addMessage(sessionId, role, content)` | Inserts one message. `role`: `"user"` or `"assistant"`. |
| `getRecentMessages(sessionId, limit?)` | Returns last `limit` messages (default 12) in **chronological** order. Each item: `{ role, content }`. |

---

## Usage in chat flow

1. `sessionId = ensureSession(body.sessionId)` — resolve or create session.
2. `history = getRecentMessages(sessionId, 12)` — load last 12 messages.
3. Use last 8 in prompt: `recent = history.slice(-8)`.
4. After user message: `addMessage(sessionId, "user", message)`.
5. After assistant reply: `addMessage(sessionId, "assistant", reply)`.

No separate “memory” table; conversation history is the message list per session.
