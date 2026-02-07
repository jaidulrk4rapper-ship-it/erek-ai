# EreK — Share pack for Perplexity

This folder contains everything needed to share the **EreK** project with Perplexity (or any reviewer) for feedback and help.

## How to use

1. **Share the whole folder** — Zip `perplexity_share/` or paste its contents when asking Perplexity for help.
2. **Start with** `00_OVERVIEW.md` for what EreK is and how to run.
3. **Deep dives:** Architecture, API, DB, and deployment are in `01_`–`04_`.
4. **What I need help with:** See `05_QUESTIONS_FOR_PERPLEXITY.md`.

## File list

| File | Purpose |
|------|---------|
| **00_OVERVIEW.md** | Project summary, purpose, tech stack, quick run |
| **01_ARCHITECTURE.md** | End-to-end flow, streaming, n8n, memory |
| **02_API_REFERENCE.md** | All endpoints, request/response, SSE format |
| **03_DATABASE.md** | SQLite schema, chat-store API |
| **04_SETUP_AND_DEPLOY.md** | Env, local run, Docker, docker-compose |
| **05_QUESTIONS_FOR_PERPLEXITY.md** | Concrete questions (streaming, errors, deploy, n8n, auth, testing, UI) |

## One-sentence summary for Perplexity

**EreK is my local-first AI chat app (Next.js, Ollama, SQLite, optional n8n) with streaming SSE, session memory, and a Perplexity-style UI; I’m sharing this pack to get advice on streaming, deployment, n8n workflows, error handling, and optional auth/testing.**
