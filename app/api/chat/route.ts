import { NextResponse } from "next/server"
import { formatErekResponse } from "@/lib/response-formatter"
import { parseNextStepsFromMessage } from "@/lib/next-steps"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const message = String(body?.message ?? body?.prompt ?? "").trim()
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      )
    }

    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
    const url = "https://api.groq.com/openai/v1/chat/completions"

    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 60_000)

    const r = await fetch(url, {
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
      signal: ac.signal,
    }).finally(() => clearTimeout(t))

    if (!r.ok) {
      const text = await r.text().catch(() => "")
      return NextResponse.json(
        { error: "groq_http_error", status: r.status, detail: text.slice(0, 500) },
        { status: 502 }
      )
    }

    const data = await r.json()
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
