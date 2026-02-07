import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const messages =
      body?.messages ??
      (body?.message
        ? [{ role: "user", content: body.message }]
        : [])

    if (!messages.length) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      )
    }

    const prompt = messages
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n")
    const model = process.env.OLLAMA_MODEL ?? "llama3"
    const baseUrl = (process.env.OLLAMA_URL ?? "").replace(/\/$/, "")

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
      }),
    })

    if (!res.ok || !res.body) {
      const text = await res.text()
      return NextResponse.json(
        { error: text || "Ollama stream failed" },
        { status: 500 }
      )
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stream error" },
      { status: 500 }
    )
  }
}
