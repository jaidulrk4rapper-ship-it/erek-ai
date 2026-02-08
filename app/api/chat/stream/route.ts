import { NextResponse } from "next/server"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const runtime = "nodejs"

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const message = String(body?.message ?? body?.prompt ?? "").trim()
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not set. Add it to .env.local" },
      { status: 500 }
    )
  }

  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: message },
  ]

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.7,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "")
    return NextResponse.json(
      { error: text || "Groq stream failed" },
      { status: res.status || 502 }
    )
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
