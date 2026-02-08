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
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 30000)

  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY missing" }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const message = String(body.message ?? body.prompt ?? "").trim()

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  try {
    const res = await withTimeout(
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      }),
      timeoutMs
    )

    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return NextResponse.json({ error: `groq_http_${res.status}`, detail: txt }, { status: 502 })
    }

    const data = await res.json()

    return NextResponse.json({
      role: "assistant",
      content: data?.choices?.[0]?.message?.content ?? "",
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "groq_failed", detail: e instanceof Error ? e.message : "API error" },
      { status: 502 }
    )
  }
}
