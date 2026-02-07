# EreK — Project Overview (for Perplexity)

## What is EreK?

**EreK** is a **local-first personal AI chat assistant** — like a small Perplexity/ChatGPT-style app that runs on my machine.

- **Local LLM:** Uses **Ollama** (e.g. Llama) so all chat stays private and fast.
- **Optional orchestrator:** Can call **n8n** first (for custom workflows, search, tools), then fall back to Ollama.
- **Persistent memory:** **SQLite** stores chat sessions and messages; last 8 turns are sent as context.
- **Multi-language:** Replies follow the user’s language (no hardcoded language; supports Hinglish, Hindi, English, etc.).
- **Streaming:** Responses stream token-by-token via **Server-Sent Events (SSE)** for better UX.
- **UI:** Clean, Perplexity-style web UI (Next.js + React + Tailwind).

**One line:** EreK is a local AI chat app with optional n8n orchestration, SQLite memory, streaming, and a Perplexity-style interface.

---

## Purpose

- **Personal assistant** — Ask questions, get answers, all local.
- **Privacy** — No data sent to OpenAI/Google; Ollama runs on my PC.
- **Extensibility** — n8n webhook lets me add search, tools, or other APIs later.
- **Learning / portfolio** — Real AI product: chat UI, provider abstraction, fallback, sessions, streaming.

---

## Tech stack

| Layer      | Technology |
|-----------|------------|
| Frontend  | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend   | Next.js API Routes (Node.js) |
| Database  | SQLite (`better-sqlite3`), file: `data/erek.db` |
| LLM       | Ollama (local) |
| Optional  | n8n (webhook) |
| Language  | TypeScript |
| Port      | 3000 |

---

## How to run (quick)

```bash
npm install
cp .env.example .env.local   # set OLLAMA_URL, OLLAMA_MODEL
npm run dev                  # http://localhost:3000
```

- **Ollama** must be running (e.g. `ollama run llama3.1`).
- Open **http://localhost:3000/chat** to chat.

---

## Document index (this share pack)

| File | Contents |
|------|----------|
| **00_OVERVIEW.md** (this file) | What EreK is, purpose, stack, run |
| **01_ARCHITECTURE.md** | End-to-end flow, streaming, n8n, memory |
| **02_API_REFERENCE.md** | All endpoints, request/response, SSE |
| **03_DATABASE.md** | Schema, tables, chat-store API |
| **04_SETUP_AND_DEPLOY.md** | Env vars, Docker, docker-compose |
| **05_QUESTIONS_FOR_PERPLEXITY.md** | What I need help with |

---

**Why sharing with Perplexity:** I want feedback and help on streaming, deployment, n8n examples, error handling, and best practices. This folder is the full project context.
