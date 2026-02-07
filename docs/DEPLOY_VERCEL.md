# EreK — Vercel deploy (Turso + admin)

## A) Summary of changes

1. **Node runtime**  
   All route handlers that touch chat/memory already had `export const runtime = "nodejs"`. Confirmed on: `app/api/chat/route.ts`, `app/api/chat/stream/route.ts`, `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/messages/route.ts`. Added same to admin routes.

2. **Turso client and DB adapter**  
   - Installed `@libsql/client`.  
   - Added `lib/db-turso.ts`: Turso client from `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, `ensureTursoSchema()` (CREATE TABLE IF NOT EXISTS for `chat_sessions` and `chat_messages` + index), and `getTursoDb()` returning async `DbRunner`.  
   - Updated `lib/db.ts`: if `TURSO_DATABASE_URL` is set, use Turso only (no `better-sqlite3` import); else use `better-sqlite3` with async wrapper.

3. **Chat-store async**  
   `lib/chat-store.ts`: all functions are async and use `await getDb()` then `db.run/get/all`. Local SQLite path wraps sync calls in `Promise.resolve()`.

4. **Schema on Turso**  
   Turso schema is applied in `lib/db-turso.ts` inside `ensureTursoSchema()` (run on first `getTursoDb()`): same columns as local (`chat_sessions`: id, created_at, title, pinned; `chat_messages`: id, session_id, role, content, created_at; index on `chat_messages(session_id, created_at)`).

5. **API routes**  
   All usages of chat-store in API routes now `await` the async functions (ensureSession, addMessage, getRecentMessages, getMessages, getSessionsWithTitle, updateSessionTitle, setSessionPinned, deleteSession).

6. **Admin panel (MVP)**  
   - **Page:** `app/admin/page.tsx` — secret input, then list last 50 sessions; “Messages” loads last 200 messages for a session; “Delete” deletes session.  
   - **APIs:**  
     - `GET /api/admin/sessions` — list last 50 sessions (Authorization: Bearer ADMIN_SECRET).  
     - `GET /api/admin/session/[id]/messages` — last 200 messages (Bearer).  
     - `DELETE /api/admin/session/[id]` — delete session + messages (Bearer).  
   - Protection: `lib/admin-auth.ts` checks `Authorization: Bearer <ADMIN_SECRET>`; no query-param auth.

7. **Build fix**  
   `app/chat/page.tsx`: wrapped `<ChatUI />` in `<Suspense>` so `useSearchParams()` in ChatUI does not break static generation.

---

## B) File-by-file (created / modified)

- **package.json** — dependency added: `@libsql/client`.
- **lib/db-turso.ts** — NEW (Turso client, schema, getTursoDb).
- **lib/db.ts** — REWRITTEN (getDb() async; Turso when env set, else better-sqlite3 wrapper).
- **lib/chat-store.ts** — REWRITTEN (all functions async, use getDb()).
- **lib/admin-auth.ts** — NEW (checkAdminAuth(req)).
- **app/api/chat/route.ts** — await ensureSession, getRecentMessages, addMessage (x3).
- **app/api/chat/stream/route.ts** — await ensureSession, getRecentMessages, addMessage (x3).
- **app/api/sessions/route.ts** — await getSessionsWithTitle(50).
- **app/api/sessions/[id]/route.ts** — await updateSessionTitle, setSessionPinned, deleteSession.
- **app/api/sessions/[id]/messages/route.ts** — await getMessages(id).
- **app/api/admin/sessions/route.ts** — NEW (GET, nodejs runtime, Bearer check, getSessionsWithTitle(50)).
- **app/api/admin/session/[id]/messages/route.ts** — NEW (GET, nodejs runtime, Bearer check, getMessages(id, 200)).
- **app/api/admin/session/[id]/route.ts** — NEW (DELETE, nodejs runtime, Bearer check, deleteSession).
- **app/admin/page.tsx** — NEW (client: secret gate, load sessions/messages, delete).
- **app/chat/page.tsx** — Wrapped ChatUI in Suspense.
- **.env.production.example** — NEW (template for Vercel).

---

## C) Vercel env template (production)

Set these in Vercel → Project → Settings → Environment Variables (Production):

```env
TURSO_DATABASE_URL=https://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
ADMIN_SECRET=your-long-random-secret

OLLAMA_URL=https://your-ollama-host:11434
OLLAMA_MODEL=llama3.1
OLLAMA_TIMEOUT_MS=20000

N8N_WEBHOOK_URL=
N8N_TIMEOUT_MS=8000
```

(Optional: add `N8N_WEBHOOK_URL` if using n8n.)

---

## D) Deploy steps checklist

1. **Turso**  
   Create a database at [turso.tech](https://turso.tech). Get `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Schema is applied automatically on first request.

2. **GitHub**  
   Push the repo to GitHub (all changes committed).

3. **Vercel**  
   - Go to [vercel.com](https://vercel.com) → Add New Project → Import the GitHub repo.  
   - Framework: Next.js. Root: `./`. Build: `npm run build`. Output: default.

4. **Environment variables**  
   In Vercel → Project → Settings → Environment Variables, add all variables from section C for **Production** (and Preview if desired). Do **not** rely on `.env.local` in Vercel.

5. **Deploy**  
   Trigger a deploy (e.g. “Deploy” from the dashboard). Build should succeed (tested with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` set so `better-sqlite3` is not loaded in prod).

6. **Admin**  
   Open `https://<your-app>.vercel.app/admin`. Enter the same value as `ADMIN_SECRET` when prompted; then you can load sessions, view messages, and delete sessions.

7. **Ollama**  
   Ensure `OLLAMA_URL` is reachable from Vercel (e.g. public URL or tunnel). If not, chat will fail until Ollama or an alternative (e.g. n8n) is configured.

---

## Build note

- With `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` set at build time, `lib/db.ts` does not load `better-sqlite3`, so the native addon is not required on Vercel.  
- Local dev: leave Turso env unset; app uses `data/erek.db` with `better-sqlite3` as before.
