# Questions for Perplexity (help needed)

I’m sharing my project **EreK** (local AI chat app: Next.js, Ollama, SQLite, optional n8n, streaming). I’d like advice on the following.

---

## 1. Streaming

- **Current:** Ollama stream is piped to SSE; UI consumes token-by-token. n8n path returns one chunk then done.
- **Questions:**
  - Best practice for backpressure when the client is slow (e.g. mobile)?
  - Should I add a “streaming” vs “non-streaming” toggle and when to use which?
  - If n8n later supports streaming, what’s a clean way to unify “stream from n8n” and “stream from Ollama” in one API?

---

## 2. Error handling

- **Current:** Try/catch in routes; 502 with `userMessage` for config/Ollama/timeout; stream sends `error` event with `detail`.
- **Questions:**
  - How to classify errors (retryable vs not) and surface them in the UI (e.g. “Retry” only when it makes sense)?
  - Any standard pattern for logging errors on the server while sending safe, user-friendly messages to the client?

---

## 3. Deployment

- **Current:** Dockerfile for the app; docker-compose example for app + Ollama + n8n; docs in `docs/DEPLOYMENT.md`.
- **Questions:**
  - Recommended way to run Ollama in production (same host vs separate service, resource limits)?
  - For a single developer / small use, is SQLite + one app container enough, or should I plan for Postgres from the start?
  - Simple HTTPS setup (e.g. Caddy in front of the app) — minimal config example?

---

## 4. n8n workflows

- **Current:** Webhook receives `{ message, history }`; must return `{ "reply": "..." }`. Doc: `docs/N8N_WORKFLOW_EXAMPLE.md` (forward message to external API).
- **Questions:**
  - Example workflow that calls a search API with `message`, then formats the result into `reply` (step-by-step in n8n)?
  - How to handle timeouts and errors inside n8n so EreK gets a clear “fallback to Ollama” path?

---

## 5. Auth (future)

- **Current:** No auth; single user, local use.
- **Questions:**
  - If I add multi-user later, what’s a minimal approach (e.g. session-based auth, one table for users) that fits Next.js API routes + SQLite?
  - Should sessionId be tied to a user id from the start, or is it fine to add “user_id” to sessions later?

---

## 6. Testing

- **Current:** Manual testing in browser; no automated tests.
- **Questions:**
  - Simple way to test `/api/chat` and `/api/chat/stream` (e.g. Node script or Postman collection) that doesn’t require the full UI?
  - Any minimal E2E approach for “send message → see streamed reply” in the chat page (e.g. Playwright)?

---

## 7. UI/UX

- **Current:** Perplexity-style layout; empty state when no messages; Mic, Test, Send; streaming updates in place.
- **Questions:**
  - Accessibility: keyboard-only usage and screen-reader friendly patterns for a streaming chat?
  - Mobile: any must-do layout or touch adjustments for a chat input + streamed replies?

---

I’ve attached (in this folder) the full context: overview, architecture, API reference, database schema, and setup/deploy. Any suggestions that fit this stack (Next.js, Ollama, SQLite, n8n) are welcome.
