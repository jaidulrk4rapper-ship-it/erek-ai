import { addMessage, ensureSession, getRecentMessages } from "@/lib/chat-store"
import { normalizeToEreKError } from "@/lib/errors"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const runtime = "nodejs"

function detectLanguage(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return "Hindi"
  if (/[\u0600-\u06FF]/.test(text)) return "Arabic"
  if (/[\u4E00-\u9FFF]/.test(text)) return "Chinese/Japanese"
  if (/\b(kya|hai|mein|ko|ke|ki)\b/i.test(text)) return "Hinglish"
  return "English"
}

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) })
     .catch((e) => { clearTimeout(t); reject(e) })
  })
}

function sendSSE(controller: ReadableStreamDefaultController, event: string, data: object | string) {
  const payload = typeof data === "string" ? data : JSON.stringify(data)
  controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${payload}\n\n`))
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const message = String(body.message ?? body.prompt ?? "").trim()
  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), { status: 400 })
  }

  const sessionId = await ensureSession(body.sessionId)
  const history = await getRecentMessages(sessionId)
  const recent = history.slice(-8)
  const transcript = recent
    .map((m: any) => {
      const role = m.role === "assistant" ? "EREK" : "User"
      const content = String(m.content ?? "").trim()
      return content ? `${role}: ${content}` : ""
    })
    .filter(Boolean)
    .join("\n")
  const prompt = `${SYSTEM_PROMPT}\n${transcript}\nUser: ${message}\nEREK:`
  const userLanguage = detectLanguage(message)
  const enhancedPrompt = `${SYSTEM_PROMPT}\n\nUser language detected: ${userLanguage}. Respond in ${userLanguage}.\n\n${transcript}\nUser: ${message}\nEREK:`

  await addMessage(sessionId, "user", message)

  const url = process.env.N8N_WEBHOOK_URL
  const n8nTimeoutMs = Number(process.env.N8N_TIMEOUT_MS || 8000)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":\n\n"))
        } catch {
          clearInterval(heartbeat)
        }
      }, 20000)
      req.signal?.addEventListener("abort", () => clearInterval(heartbeat))

      try {
        if (url) {
          try {
            const ac = new AbortController()
            const t = setTimeout(() => ac.abort(), n8nTimeoutMs)
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message, history }),
              signal: ac.signal,
            }).finally(() => clearTimeout(t))
            const raw = await res.text().catch(() => "")
            if (res.ok && raw) {
              const data = JSON.parse(raw)
              const reply = String(data?.reply ?? "").trim()
              if (reply) {
                await addMessage(sessionId, "assistant", reply)
                sendSSE(controller, "chunk", { chunk: reply })
                const donePayload: { sessionId: string; reply: string; via: string; sources?: string[] } = { sessionId, reply, via: "n8n" }
                if (Array.isArray(data.sources)) donePayload.sources = data.sources
                sendSSE(controller, "done", donePayload)
                controller.close()
                return
              }
            }
          } catch {
            // fallback to Ollama
          }
        }

        const OLLAMA_URL = process.env.OLLAMA_URL
        const OLLAMA_MODEL = process.env.OLLAMA_MODEL
        const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 20000)
        if (!OLLAMA_URL || !OLLAMA_MODEL) {
          sendSSE(controller, "error", { error: "Ollama not configured", detail: "Set OLLAMA_URL and OLLAMA_MODEL in .env.local" })
          controller.close()
          return
        }

        const res = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: OLLAMA_MODEL, prompt: enhancedPrompt, stream: true }),
        })
        if (!res.ok) {
          const txt = await res.text().catch(() => "")
          sendSSE(controller, "error", { error: "Ollama connection failed", detail: `Ollama returned ${res.status}. Is it running? ${txt.slice(0, 100)}` })
          controller.close()
          return
        }

        const reader = res.body?.getReader()
        if (!reader) {
          sendSSE(controller, "error", { error: "Ollama stream failed", detail: "No response body" })
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ""
        let fullReply = ""
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""
            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const obj = JSON.parse(line)
                if (obj.response != null) {
                  fullReply += obj.response
                  sendSSE(controller, "chunk", { chunk: obj.response })
                }
              } catch {
                // skip non-JSON lines
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
        fullReply = fullReply.trim()
        await addMessage(sessionId, "assistant", fullReply)
        sendSSE(controller, "done", { sessionId, reply: fullReply, via: "ollama_fallback" })
      } catch (e: unknown) {
        const erk = normalizeToEreKError(e)
        sendSSE(controller, "error", { error: erk.code, detail: erk.userMessage, retryable: erk.retryable })
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
