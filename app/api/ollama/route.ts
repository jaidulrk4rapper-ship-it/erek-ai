import { NextResponse } from "next/server"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const runtime = "nodejs"

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) })
     .catch((e) => { clearTimeout(t); reject(e) })
  })
}

export async function POST(req: Request) {
  const OLLAMA_URL = process.env.OLLAMA_URL
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 20000)

  if (!OLLAMA_URL || !OLLAMA_MODEL) {
    return NextResponse.json({ error: "OLLAMA_URL or OLLAMA_MODEL missing" }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const message = String(body.message ?? body.prompt ?? "").trim()

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  const prompt = `${SYSTEM_PROMPT}\nUser: ${message}\nEreK:`

  try {
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
      return NextResponse.json({ error: `ollama_http_${res.status}`, detail: txt }, { status: 502 })
    }

    const data: any = await res.json().catch(() => null)
    const reply = String(data?.response ?? "").trim()

    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({ error: "ollama_failed", detail: String(e?.message || e) }, { status: 502 })
  }
}
