# Simple local memory (SQLite)

## Flow

```
Chat UI  →  /api/chat  →  load memory  →  send history to Ollama (or n8n)  →  save reply
```

1. **Chat UI** sends `{ message, sessionId? }` to `/api/chat`.
2. **`/api/chat`**  
   - Resolves/creates **session** (`ensureSession(sessionId)`).  
   - **Loads memory** from SQLite: `getRecentMessages(sessionId, 12)`.  
   - Saves **user message**: `addMessage(sessionId, "user", message)`.  
   - Tries **n8n** with `{ message, history }`; on failure/empty, **Ollama** with prompt built from `SYSTEM_PROMPT + transcript + User: message + EreK:`.  
   - On reply: **saves assistant message** `addMessage(sessionId, "assistant", reply)`.  
   - Returns `{ reply, via, sessionId }`.
3. **Chat UI** keeps `sessionId` in state + `localStorage` and sends it on next message.

## Storage

| Layer        | File / place      | Role                                      |
|-------------|-------------------|-------------------------------------------|
| **SQLite**  | `data/erek.db`    | `chat_sessions` + `chat_messages`          |
| **Store**   | `lib/chat-store.ts` | `ensureSession`, `getRecentMessages`, `addMessage` |
| **DB init** | `lib/db.ts`       | Creates DB + tables + index                |

## Token control

- **Load:** last **12** messages from DB.  
- **Prompt:** last **8** messages used in transcript to Ollama (keeps context within limits).

## New Chat

- UI: `localStorage.removeItem("erek_session_id")`, `setSessionId("")`, reset messages.  
- Next request gets new `sessionId` from API; new session row in DB.
