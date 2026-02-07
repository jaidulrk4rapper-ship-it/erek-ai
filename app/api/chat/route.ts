import { NextResponse } from "next/server"
import { addMessage, ensureSession, getRecentMessages } from "@/lib/chat-store"
import { normalizeToEreKError } from "@/lib/errors"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const runtime = "nodejs"

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) })
     .catch((e) => { clearTimeout(t); reject(e) })
  })
}

async function callOllamaDirect(prompt: string) {
  const OLLAMA_URL = process.env.OLLAMA_URL
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 20000)
  if (!OLLAMA_URL || !OLLAMA_MODEL) throw new Error("OLLAMA_URL or OLLAMA_MODEL missing")

  const res = await withTimeout(
    fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    }),
    timeoutMs
  )

  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`ollama_http_${res.status}:${txt}`)
  }

  const data = await res.json()
  return String(data?.response ?? "").trim()
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const message = String(body.message ?? body.prompt ?? "").trim()

  const sessionId = await ensureSession(body.sessionId)
  const history = await getRecentMessages(sessionId)
  const recent = history.slice(-8)

  const transcript = recent
    .map((m: { role: string; content: string }) => {
      const role = m.role === "assistant" ? "assistant" : "user"
      const content = String(m.content ?? "").trim()
      return content ? `${role}: ${content}` : ""
    })
    .filter(Boolean)
    .join("\n")
  const prompt = `${SYSTEM_PROMPT}\n${transcript}\nuser: ${message}\nassistant:`

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  // save user
  await addMessage(sessionId, "user", message)

  const url = process.env.N8N_WEBHOOK_URL
  const timeoutMs = Number(process.env.N8N_TIMEOUT_MS || 8000)

  console.log("N8N_WEBHOOK_URL is", url ? "SET" : "MISSING")

  if (url) {
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      }).finally(() => clearTimeout(t))

      const raw = await res.text().catch(() => "")
      console.log("n8n status:", res.status)
      console.log("n8n raw:", raw)

      if (res.ok && raw) {
        const data = JSON.parse(raw)
        const reply = String(data?.reply ?? "").trim()
        if (reply) {
          await addMessage(sessionId, "assistant", reply)
          return NextResponse.json({ reply, via: "n8n", sessionId })
        }
      }
    } catch (e: any) {
      console.log("n8n error:", e?.message || e)
    }
  }

  // 2) Fallback to Ollama direct (with context)
  try {
    const reply = await callOllamaDirect(prompt)
    await addMessage(sessionId, "assistant", reply)
    return NextResponse.json({ reply, via: "ollama_fallback", sessionId })
  } catch (e: unknown) {
    const erk = normalizeToEreKError(e)
    return NextResponse.json(
      { error: erk.code, userMessage: erk.userMessage, retryable: erk.retryable, detail: erk.detail },
      { status: 502 }
    )
  }
}
