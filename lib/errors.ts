export class EreKError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public retryable: boolean,
    public detail?: string
  ) {
    super(userMessage)
    this.name = "EreKError"
  }
}

export function normalizeToEreKError(e: unknown): EreKError {
  if (e instanceof EreKError) return e
  const err = e as NodeJS.ErrnoException & { cause?: unknown }
  const msg = err?.message ?? String(e)
  const code = err?.code ?? ""

  if (code === "ECONNREFUSED" || msg.includes("ECONNREFUSED")) {
    return new EreKError(
      "service_unavailable",
      "Service is not reachable. Please try again.",
      true,
      msg
    )
  }
  if (code === "ETIMEDOUT" || code === "ABORT_ERR" || msg.includes("timeout") || msg.includes("abort")) {
    return new EreKError(
      "timeout",
      "Request timed out. Please try again.",
      true,
      msg
    )
  }
  if (msg.includes("GROQ_API_KEY") || msg.includes("GROQ_MODEL")) {
    return new EreKError(
      "config_missing",
      "Groq is not configured. Set GROQ_API_KEY (and optionally GROQ_MODEL) in .env.local and restart.",
      false,
      msg
    )
  }
  if (msg.includes("groq_http_") || msg.includes("Groq error")) {
    return new EreKError(
      "groq_http_error",
      "Groq API is not responding. Check your API key and rate limits.",
      true,
      msg
    )
  }

  return new EreKError(
    "unknown",
    "Could not get a reply. Check that GROQ_API_KEY is set in .env.local.",
    false,
    msg
  )
}
