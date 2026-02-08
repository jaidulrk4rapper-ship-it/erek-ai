export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

const GROQ_API_KEY = process.env.GROQ_API_KEY || ""
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

export async function chatWithOllama(messages: ChatMessage[]) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Groq error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ""
}
