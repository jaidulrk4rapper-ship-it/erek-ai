import { NextResponse } from "next/server"
import { formatErekResponse } from "@/lib/response-formatter"
import { parseNextStepsFromMessage } from "@/lib/next-steps"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const runtime = "nodejs"

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const message = String(body?.message ?? body?.prompt ?? "").trim()
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "GROQ_API_KEY_not_configured" },
        { status: 500 }
      )
    }
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

    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 60_000)

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature: 0.7,
      }),
      signal: ac.signal,
    }).finally(() => clearTimeout(t))

    if (!r.ok) {
      const text = await r.text().catch(() => "")
      return NextResponse.json(
        { error: "groq_http_error", status: r.status, detail: text.slice(0, 500) },
        { status: 502 }
      )
    }

    const data = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const rawText = data?.choices?.[0]?.message?.content ?? ""
    const parsedNextSteps = parseNextStepsFromMessage(rawText)
    const text = formatErekResponse(rawText, { userMessage: message })
    const nextSteps =
      parsedNextSteps.length >= 2 ? parsedNextSteps.slice(0, 4) : undefined
    return NextResponse.json({ text, nextSteps })
  } catch (e: unknown) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "groq_timeout"
        : e instanceof Error
          ? String(e.message)
          : "groq_fetch_failed"
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
