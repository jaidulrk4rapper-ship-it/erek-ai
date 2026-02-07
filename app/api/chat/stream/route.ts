import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const message = String(body?.message ?? body?.prompt ?? "").trim()
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  const baseUrl = (process.env.OLLAMA_URL ?? "").replace(/\/$/, "")
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL,
      prompt: message,
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text()
    return NextResponse.json({ error: text || "Ollama stream failed" }, { status: res.status || 500 })
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
