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

    const ollamaUrl = process.env.OLLAMA_URL!.replace(/\/$/, "")
    const model = process.env.OLLAMA_MODEL ?? "llama3.1"
    const endpoint = ollamaUrl.includes("/api/chat") ? ollamaUrl : `${ollamaUrl}/api/chat`

    const ollamaRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    })

    if (!ollamaRes.ok || !ollamaRes.body) {
      const text = await ollamaRes.text()
      return NextResponse.json(
        { error: text || "Ollama stream failed" },
        { status: 500 }
      )
    }

    return new Response(ollamaRes.body, {
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
