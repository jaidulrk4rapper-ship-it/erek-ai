export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"

export async function chatWithGroq(messages: ChatMessage[]): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local")
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      stream: false,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Groq error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data?.choices?.[0]?.message?.content ?? ""
}

/** @deprecated Use chatWithGroq. Kept for compatibility. */
export const chatWithOllama = chatWithGroq
