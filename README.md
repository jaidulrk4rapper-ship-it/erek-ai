# EreK — Your Personal AI Assistant

Local-first AI chat powered by **Ollama**. Privacy-focused, fast, extensible.

---

## Quick Start

1. **Install Ollama** (if you haven’t):
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```
   Or download from [ollama.com](https://ollama.com).

2. **Pull a model**:
   ```bash
   ollama pull llama3.1
   ```

3. **Run EreK**:
   ```bash
   npm install
   npm run dev
   ```

4. **Chat**: open [http://localhost:3000/chat](http://localhost:3000/chat)

---

## Features

- **100% local** — No data sent to the cloud; Ollama runs on your machine.
- **Real-time streaming** — Responses stream token-by-token.
- **Persistent memory** — Conversations saved in SQLite; context kept across messages.
- **Extensible** — Optional [n8n](https://n8n.io) webhook for custom workflows (search, tools).
- **Multi-language** — Replies follow your language (English, Hindi, Hinglish, etc.).
- **Markdown & code** — Assistant replies support markdown and syntax-highlighted code.
- **Session history** — Sidebar lists past conversations; click to load.

---

## What is EreK?

EreK is a small Next.js app for **local Ollama chat**. It talks to Ollama (and optionally n8n) and exposes a simple UI and APIs. Fast, simple, loop-proof.

- **Chat** — n8n first (if configured), then Ollama fallback. Conversation history is sent and used as context (last 8 turns).

---

## Setup (detailed)

1. Copy `.env.example` to `.env.local` and set:
   - `OLLAMA_URL=http://localhost:11434`
   - `OLLAMA_MODEL=llama3.1`
2. Run `npm run dev` (port 3000). If 3000 is busy, kill the process using it or change the port in `package.json`.
3. Open [http://localhost:3000](http://localhost:3000)

---

## Env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `OLLAMA_URL` | Yes | Ollama base URL (e.g. `http://localhost:11434`) |
| `OLLAMA_MODEL` | Yes | Model name (e.g. `llama3.1`) |
| `OLLAMA_TIMEOUT_MS` | No | Timeout for Ollama (default `20000`) |
| `N8N_WEBHOOK_URL` | No | n8n webhook URL; if set, chat tries n8n first |
| `N8N_TIMEOUT_MS` | No | Timeout for n8n (default `8000`) |

---

## Endpoints

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/ollama` | POST | `{ "message": "..." }` | Direct Ollama; returns `{ "reply": "..." }`. |
| `/api/chat` | POST | `{ "message": "...", "sessionId"?: "..." }` | n8n first, then Ollama fallback. Returns `{ "reply", "via", "sessionId" }`. |
| `/api/chat/stream` | POST | Same as `/api/chat` | Streaming response (SSE). Used by the UI. |
| `/api/sessions` | GET | — | List past session ids and created_at. |
| `/api/sessions/[id]/messages` | GET | — | Get messages for a session. |

---

## Optional n8n workflow

If you set `N8N_WEBHOOK_URL`, chat requests are sent there first. The webhook receives `message` and `history`; respond with JSON `{ "reply": "..." }`. If the webhook fails or returns non-OK, the app falls back to Ollama. See `docs/N8N_SETUP.md` and `docs/N8N_WORKFLOW_EXAMPLE.md`.

---

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Ollama](https://ollama.ai)
