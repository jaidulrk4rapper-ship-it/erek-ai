# Deployment (Docker)

EreK can run in Docker. Ollama and n8n are **not** included in the app image (they need more resources); run them separately or via docker-compose.

## 1) Build and run the app only

```bash
docker build -t erek .
docker run -p 3000:3000 \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  -e OLLAMA_MODEL=llama3.1 \
  -v $(pwd)/data:/app/data \
  erek
```

- `data/` is mounted so SQLite DB persists.
- `OLLAMA_URL` must point to Ollama. If Ollama runs on the host, use `http://host.docker.internal:11434` (Mac/Windows) or host IP on Linux.

## 2) docker-compose (app + Ollama + n8n)

Create `docker-compose.yml` in the project root:

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OLLAMA_URL=http://ollama:11434
      - OLLAMA_MODEL=llama3.1
      - N8N_WEBHOOK_URL=http://n8n:5678/webhook/erek
      - N8N_TIMEOUT_MS=8000
    volumes:
      - erek_data:/app/data
    depends_on:
      - ollama

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        limits:
          cpus: "8"
          memory: 32G
        reservations:
          cpus: "4"
          memory: 16G

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  erek_data:
  ollama_data:
  n8n_data:
```

Then:

```bash
docker compose up -d
# Pull model (one-time): docker compose exec ollama ollama run llama3.1
```

- App: http://localhost:3000  
- Ollama: http://localhost:11434  
- n8n: http://localhost:5678 (activate workflow with webhook path `erek`)

## 3) Resource limits (Ollama)

The `deploy.resources` under `ollama` limits CPU and memory so one service doesn’t starve others. Adjust to your host:

- **limits:** max 8 CPUs, 32G RAM
- **reservations:** min 4 CPUs, 16G RAM

If your machine has less RAM, lower these (e.g. `memory: 8G`).

## 4) Production notes

- **Ollama** in Docker can use a lot of RAM; ensure enough memory or run Ollama on the host and set `OLLAMA_URL` to host.
- **SQLite** in `data/` is fine for single-instance; for multiple replicas you’d need a shared DB or switch to Postgres.
- Use a reverse proxy (e.g. Caddy, Nginx) for HTTPS in front of the app.
