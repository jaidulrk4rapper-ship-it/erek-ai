# EreK — Architecture

## High-level flow

```
[User] → Browser (Chat UI)
            ↓
        POST /api/chat/stream  { message, sessionId? }
            ↓
        Next.js API Route (stream)
            ↓
        ensureSession(sessionId)  →  getRecentMessages(sessionId) from SQLite
            ↓
        addMessage(sessionId, "user", message)
            ↓
        Try n8n: POST { message, history } to N8N_WEBHOOK_URL
            ↓  (if 200 + reply)
        SSE: event "chunk" (full reply), event "done" { sessionId, reply, via: "n8n" }
            ↓  (if fail / no reply)
        Ollama: POST /api/generate with stream: true
            ↓
        Pipe NDJSON stream → for each .response send SSE "chunk" → accumulate reply
            ↓
        addMessage(sessionId, "assistant", fullReply)
        SSE: event "done" { sessionId, reply, via: "ollama_fallback" }
            ↓
        UI: consume SSE, append chunks to message; on "done" save sessionId to localStorage
```

---

## Chat flow (detail)

1. **UI** sends `{ message, sessionId }`. If no `sessionId`, backend creates one.
2. **Backend** loads last 12 messages from SQLite for that session; uses last 8 in the prompt (token control).
3. **Prompt** = `SYSTEM_PROMPT` + transcript (User:/EreK: lines) + `User: <new message>\nEreK:`.
4. **n8n** (if configured): POST to webhook with `{ message, history }`. Expects `{ "reply": "..." }`. On success, stream that reply in one chunk and close.
5. **Ollama fallback:** POST to Ollama `/api/generate` with `stream: true`. Read NDJSON; for each chunk with `.response`, send SSE `chunk`; at end save to DB and send `done`.
6. **UI** keeps `sessionId` in state and `localStorage` (`erek_session`) for the next request.

---

## Streaming (SSE)

- **Endpoint:** `POST /api/chat/stream` (same body as `/api/chat`).
- **Response:** `Content-Type: text/event-stream`.
- **Events:**
  - `chunk` — `data: {"chunk":"<token or segment>"}`. UI appends to current assistant message.
  - `done` — `data: {"sessionId","reply","via"}`. UI saves sessionId, stops.
  - `error` — `data: {"error","detail"}`. UI shows error message.
- **Ollama:** Uses native streaming (NDJSON); we parse and forward as `chunk` events.
- **n8n:** Non-streaming; we send the full reply as one `chunk` then `done`.

---

## Memory (SQLite)

- **File:** `data/erek.db`.
- **Tables:** `chat_sessions` (id, created_at), `chat_messages` (id, session_id, role, content, created_at).
- **Logic:** `ensureSession(sessionId)` → create if missing; `getRecentMessages(sessionId, 12)` → last 12 in chronological order; `addMessage(sessionId, role, content)` → insert. Last 8 messages used in prompt.

---

## n8n integration

- **Optional.** If `N8N_WEBHOOK_URL` is set, chat tries n8n first.
- **Payload:** `{ "message": "<user message>", "history": [ { "role", "content" }, ... ] }`.
- **Expected response:** HTTP 200, JSON `{ "reply": "<assistant reply>" }`.
- **On timeout / non-200 / empty reply:** Fallback to Ollama. No change to contract.

---

## Key files

| Path | Role |
|------|------|
| `app/api/chat/route.ts` | Non-streaming chat (n8n → Ollama), JSON response |
| `app/api/chat/stream/route.ts` | Streaming chat, SSE, used by UI |
| `app/api/ollama/route.ts` | Direct Ollama, single message → reply |
| `lib/chat-store.ts` | ensureSession, addMessage, getRecentMessages |
| `lib/db.ts` | SQLite init, schema |
| `lib/system-prompt.ts` | Shared system prompt (language, behaviour) |
| `components/ChatUI.tsx` | Chat UI, calls /api/chat/stream, consumes SSE |
