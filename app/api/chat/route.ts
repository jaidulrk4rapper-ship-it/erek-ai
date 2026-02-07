import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const message = String(body?.message ?? body?.prompt ?? "").trim()
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    const raw = process.env.OLLAMA_URL
    if (!raw && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "OLLAMA_URL_not_configured" },
        { status: 500 }
      )
    }
    const baseUrl = (raw ?? "http://127.0.0.1:11434").replace(/\/$/, "")
    const url = `${baseUrl}/api/generate`

    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 60_000)

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL,
        prompt: message,
        stream: false,
      }),
      signal: ac.signal,
    }).finally(() => clearTimeout(t))

    if (!r.ok) {
      const text = await r.text().catch(() => "")
      return NextResponse.json(
        { error: "ollama_http_error", status: r.status, detail: text.slice(0, 500) },
        { status: 502 }
      )
    }

    const data = await r.json()
    return NextResponse.json({ text: data?.response ?? "" })
  } catch (e: unknown) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "ollama_timeout"
        : e instanceof Error
          ? String(e.message)
          : "ollama_fetch_failed"
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
