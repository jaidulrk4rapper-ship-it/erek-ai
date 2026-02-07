export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1"

export async function chatWithOllama(messages: ChatMessage[]) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: { temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Ollama error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as { message?: { content?: string } }
  return data?.message?.content ?? ""
}
