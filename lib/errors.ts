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
      "ollama_unavailable",
      "Ollama is not running. Please start Ollama and try again.",
      true,
      msg
    )
  }
  if (code === "ETIMEDOUT" || code === "ABORT_ERR" || msg.includes("timeout") || msg.includes("abort")) {
    return new EreKError(
      "timeout",
      "Request timed out. Ollama or n8n may be slow or unreachable.",
      true,
      msg
    )
  }
  if (msg.includes("OLLAMA_URL") || msg.includes("OLLAMA_MODEL")) {
    return new EreKError(
      "config_missing",
      "Ollama is not configured. Set OLLAMA_URL and OLLAMA_MODEL in .env.local and restart.",
      false,
      msg
    )
  }
  if (msg.includes("ollama_http_")) {
    return new EreKError(
      "ollama_http_error",
      "Ollama is not responding. Is it running? (e.g. ollama run llama3.1)",
      true,
      msg
    )
  }

  return new EreKError("unknown", "Could not get a reply. Check that Ollama is running and .env.local is set.", false, msg)
}
