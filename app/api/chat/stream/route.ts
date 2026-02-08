import { NextResponse } from "next/server"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const message = String(body?.message ?? body?.prompt ?? "").trim()
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 })
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text()
    return NextResponse.json({ error: text || "Groq stream failed" }, { status: res.status || 500 })
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
