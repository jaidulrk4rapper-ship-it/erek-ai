# EreK — Setup and Deployment

## Local setup

1. **Clone / open project**
   ```bash
   cd erek_ai_v0
   ```

2. **Install**
   ```bash
   npm install
   ```

3. **Environment**
   - Copy `.env.example` to `.env.local`.
   - Set:
     - `OLLAMA_URL=http://localhost:11434`
     - `OLLAMA_MODEL=llama3.1`
   - Optional: `N8N_WEBHOOK_URL`, `N8N_TIMEOUT_MS`, `OLLAMA_TIMEOUT_MS`.

4. **Run Ollama**
   ```bash
   ollama run llama3.1
   ```
   (Or another model; set same name in `OLLAMA_MODEL`.)

5. **Run app**
   ```bash
   npm run dev
   ```
   - App: http://localhost:3000  
   - Chat: http://localhost:3000/chat  

Port is fixed to 3000 in `package.json` (`next dev -p 3000`).

---

## Docker (app only)

```bash
docker build -t erek .
docker run -p 3000:3000 \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  -e OLLAMA_MODEL=llama3.1 \
  -v $(pwd)/data:/app/data \
  erek
```

- Persist DB: mount `./data` to `/app/data`.
- If Ollama runs on host, use `host.docker.internal` (Mac/Windows) or host IP.

---

## Docker Compose (app + Ollama + n8n)

Example `docker-compose.yml` in repo root or in `docs/DEPLOYMENT.md`:

- **app** — Next.js, port 3000, env points to `ollama:11434` and `n8n:5678`.
- **ollama** — image `ollama/ollama`, port 11434, volume for models.
- **n8n** — image `n8nio/n8n`, port 5678.

Commands:

```bash
docker compose up -d
docker compose exec ollama ollama run llama3.1   # one-time model pull
```

Then open http://localhost:3000 and (for n8n) http://localhost:5678, create webhook workflow with path `erek`, activate it, set `N8N_WEBHOOK_URL=http://n8n:5678/webhook/erek` for the app (or via compose env).

---

## Production notes

- **Ollama** in Docker can use significant RAM; consider running Ollama on the host.
- **SQLite** is fine for a single instance; for multiple app replicas, use a shared DB or switch to Postgres.
- Put a reverse proxy (e.g. Caddy, Nginx) in front for HTTPS.
