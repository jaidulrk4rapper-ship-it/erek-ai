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
      "groq_unavailable",
      "Groq API is not reachable. Please check your internet connection.",
      true,
      msg
    )
  }
  if (code === "ETIMEDOUT" || code === "ABORT_ERR" || msg.includes("timeout") || msg.includes("abort")) {
    return new EreKError(
      "timeout",
      "Request timed out. Groq API may be slow or unreachable.",
      true,
      msg
    )
  }
  if (msg.includes("GROQ_API_KEY")) {
    return new EreKError(
      "config_missing",
      "Groq is not configured. Set GROQ_API_KEY in your environment variables and redeploy.",
      false,
      msg
    )
  }
  if (msg.includes("groq_http_")) {
    return new EreKError(
      "groq_http_error",
      "Groq API returned an error. Please try again.",
      true,
      msg
    )
  }

  return new EreKError("unknown", "Could not get a reply. Check that GROQ_API_KEY is set correctly.", false, msg)
}
