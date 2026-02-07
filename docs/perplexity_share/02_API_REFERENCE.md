# EreK — API Reference

## Base URL

- Local: `http://localhost:3000`
- All endpoints accept `Content-Type: application/json` for POST bodies.

---

## 1. POST /api/chat (non-streaming)

Legacy endpoint; UI uses `/api/chat/stream`. Useful for scripts or tools.

**Request**

```json
{
  "message": "user message text",
  "sessionId": "optional-uuid"
}
```

**Success (200)**

```json
{
  "reply": "assistant reply text",
  "via": "n8n" | "ollama_fallback",
  "sessionId": "uuid"
}
```

**Error (400)** — missing message

```json
{ "error": "message is required" }
```

**Error (502)** — n8n + Ollama both failed

```json
{
  "error": "all_providers_failed",
  "detail": "technical message",
  "userMessage": "Human-readable message (e.g. Ollama not running)"
}
```

---

## 2. POST /api/chat/stream (streaming, used by UI)

Same request body as `/api/chat`. Response is **Server-Sent Events (SSE)**.

**Request**

```json
{
  "message": "user message text",
  "sessionId": "optional-uuid"
}
```

**Response**

- `Content-Type: text/event-stream`
- Events:
  - **chunk** — `data: {"chunk":"<text>"}`. Append to assistant message.
  - **done** — `data: {"sessionId","reply","via"}`. Conversation done; store sessionId.
  - **error** — `data: {"error","detail"}`. Show error to user.

**Example (Ollama stream)**

```
event: chunk
data: {"chunk":"Hello"}

event: chunk
data: {"chunk":" world"}

event: done
data: {"sessionId":"...","reply":"Hello world","via":"ollama_fallback"}
```

---

## 3. POST /api/ollama (direct Ollama)

Single user message → single reply. Uses same system prompt as chat. No session/history.

**Request**

```json
{
  "message": "user message",
  "prompt": "optional alias for message"
}
```

**Success (200)**

```json
{ "reply": "assistant reply text" }
```

**Error (400)** — missing message

```json
{ "error": "message is required" }
```

**Error (502)** — Ollama error

```json
{
  "error": "ollama_failed",
  "detail": "error message"
}
```

---

## Environment (backend)

| Variable | Required | Description |
|----------|----------|-------------|
| OLLAMA_URL | Yes | e.g. `http://localhost:11434` |
| OLLAMA_MODEL | Yes | e.g. `llama3.1` |
| OLLAMA_TIMEOUT_MS | No | Default 20000 |
| N8N_WEBHOOK_URL | No | e.g. `http://localhost:5678/webhook/erek` |
| N8N_TIMEOUT_MS | No | Default 8000 |
