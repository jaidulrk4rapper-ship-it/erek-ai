# n8n workflow example — forward message to external API

EreK sends to your n8n webhook: `{ "message": "...", "history": [ { "role", "content" } ] }`.  
You must respond with JSON: `{ "reply": "..." }`.

This example forwards the user message to an **external API** (e.g. search or another LLM) and returns the result as `reply`.

## 1) Webhook (trigger)

- Add node: **Webhook**
- HTTP Method: **POST**
- Path: `erek` (so URL = `http://localhost:5678/webhook/erek`)
- Respond: **Immediately** (we’ll use “Respond to Webhook” later)

## 2) HTTP Request (external API)

- Add node: **HTTP Request**
- Method: **POST** (or GET if your API is GET)
- URL: your external API (e.g. `https://api.example.com/search` or a second LLM)
- Body (example):  
  `{ "query": "{{ $json.body.message }}" }`  
  so the incoming user message is sent as `query`.

If the external API returns something like `{ "result": "..." }` or `{ "answer": "..." }`, use that field in the next step.

## 3) Respond to Webhook

- Add node: **Respond to Webhook**
- Respond With: **JSON**
- Response Body (example):  
  `{ "reply": "{{ $json.result }}" }`  
  (or `{{ $json.answer }}` / whatever your API returns)

So: **Webhook** → **HTTP Request** (forward `message` to external API) → **Respond to Webhook** with `{ "reply": "<from API>" }`.

## 4) Optional: use history

If your external API accepts conversation history, in the HTTP Request body you can send:

- `message`: `{{ $json.body.message }}`
- `history`: `{{ $json.body.history }}`

EreK sends both in the webhook payload.

## 5) Activate

- Turn the workflow **On** (Publish/Activate).
- In EreK `.env.local` set:  
  `N8N_WEBHOOK_URL=http://localhost:5678/webhook/erek`

Now when you chat in EreK, the message goes to n8n → your API → reply back to EreK. If n8n or the API fails, EreK falls back to Ollama.
