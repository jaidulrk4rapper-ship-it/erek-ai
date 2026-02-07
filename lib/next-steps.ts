/**
 * Lightweight heuristics to generate 2–4 "Next step" suggestions from assistant message text.
 * Used when model doesn't output explicit next steps; also for formatter auto-append.
 * Aligned with ChatGPT-like style: debugging → commands, planning → checklist, creative → variants.
 */

const CODE_SUGGESTIONS = [
  "Apply this patch",
  "Show full file",
  "Explain errors",
  "Add tests",
]

const TROUBLESHOOTING_SUGGESTIONS = [
  "Run this command",
  "Share output",
  "Try alternate fix",
]

const PLANNING_SUGGESTIONS = [
  "Create a new document",
  "Convert to checklist",
  "Pick an option",
  "Convert to steps",
]

const CREATIVE_SUGGESTIONS = [
  "Generate 3 variants",
  "Add a hook",
  "Make thumbnail prompt",
  "Shorten / lengthen",
]

/** When reply looks like something to save (summary, list, steps) */
const DOCUMENT_SUGGESTIONS = [
  "Create a new document",
  "Copy to clipboard",
  "Tell me more",
  "Edit or shorten",
]

const DEFAULT_SUGGESTIONS = [
  "Create a new document",
  "Tell me more",
  "Explain simply",
  "Give an example",
]

/** Detect if message contains code blocks or code-like content */
function hasCode(text: string): boolean {
  return /```[\s\S]*?```/.test(text) || /\b(function|def |class |const |let |import |from |npm |yarn |git |curl )\b/i.test(text)
}

/** Detect troubleshooting: errors, fix, run, command, debug */
function isTroubleshooting(text: string): boolean {
  return /\b(error|fix|debug|run|command|output|failed|try|troubleshoot)\b/i.test(text)
}

/** Detect planning: plan, steps, todo, checklist, task */
function isPlanning(text: string): boolean {
  return /\b(plan|steps?|todo|checklist|task|outline|first|then|finally)\b/i.test(text)
}

/** Detect creative: ideas, variants, hook, prompt, thumbnail, story, copy */
function isCreative(text: string): boolean {
  return /\b(idea|variant|hook|prompt|thumbnail|story|copy|tagline|headline|creative)\b/i.test(text)
}

/** Detect reply that user might want to save as doc: list, summary, steps, outline */
function isDocumentWorthy(text: string): boolean {
  const hasList = /^[\s]*[-*•]\s+/m.test(text) || /^[\s]*\d+[.)]\s+/m.test(text)
  const hasSummaryWords = /\b(summary|steps?|outline|list|notes?|here’?s what|following)\b/i.test(text)
  return (hasList && text.split(/\n/).length >= 3) || hasSummaryWords
}

/** Short/greeting user messages where Next step is not needed */
const SMALL_TALK_USER_PATTERN = /^(hi|hello|hey|bye|good\s*(morning|night|day|afternoon)|gm|gn|a\.?o\.?|how\s*are\s*you|what'?s\s*up|sup|good|ok(ay)?|thanks?|thank\s*you|date|what'?s\s*the\s*date|kaise\s*ho|kya\s*hal|namaste|ram\s*ram|goodbye|see\s*you|take\s*care)[\s!?.]*$/i

/**
 * True when this is small talk / short exchange — do not show or append Next step.
 * Use for: Hi, Hello, Bye, How are you, What's the date, Good morning, etc.
 */
export function shouldShowNextSteps(
  messageText: string,
  context?: { userMessage?: string }
): boolean {
  const user = (context?.userMessage ?? "").trim()
  const reply = (messageText ?? "").trim()
  if (!reply) return false
  const userShort = user.length <= 40 && SMALL_TALK_USER_PATTERN.test(user)
  const replyVeryShort = reply.length < 120 && reply.split(/\n/).length <= 2
  const replyLooksGreeting = /\b(hi|hello|hey|bye|good|fine|thanks?|ok|sure|theek\s*hai|haan|date\s+is|it'?s\s+\d)\b/i.test(reply) && !reply.includes("Next step")
  if (userShort && (replyVeryShort || replyLooksGreeting)) return false
  if (replyVeryShort && replyLooksGreeting) return false
  return true
}

/** Parse "next step" or "next steps" section from model output if present. Exported for API to use before stripping. */
export function parseNextStepsFromMessage(text: string): string[] {
  const lower = text.toLowerCase()
  const markers = ["next step:", "next steps:", "suggestions:", "you can:", "try:"]
  for (const marker of markers) {
    const idx = lower.indexOf(marker)
    if (idx === -1) continue
    const after = text.slice(idx + marker.length).trim()
    const lines = after.split(/\n/).map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
    const suggestions = lines.slice(0, 4).filter((l) => l.length < 80)
    if (suggestions.length >= 2) return suggestions
  }
  return []
}

/**
 * Generate 2–4 actionable next-step suggestions from assistant message text.
 * Prefer parsed suggestions from message; otherwise use heuristics (code / troubleshooting / planning / creative / default).
 * recentContext.userMessage can nudge category (e.g. "debug" in user message → troubleshooting).
 */
export function generateNextSteps(
  messageText: string,
  recentContext?: { userMessage?: string }
): string[] {
  if (!messageText || typeof messageText !== "string") return []
  if (!shouldShowNextSteps(messageText, recentContext)) return []

  const parsed = parseNextStepsFromMessage(messageText)
  if (parsed.length >= 2) return parsed.slice(0, 4)

  const text = messageText.trim()
  const userText = (recentContext?.userMessage ?? "").toLowerCase()

  if (hasCode(text) || /\b(code|patch|file|error|test)\b/.test(userText))
    return CODE_SUGGESTIONS
  if (isTroubleshooting(text) || /\b(debug|fix|error|run|command|broken)\b/.test(userText))
    return TROUBLESHOOTING_SUGGESTIONS
  if (isPlanning(text) || /\b(plan|steps|todo|checklist|task)\b/.test(userText))
    return PLANNING_SUGGESTIONS
  if (isCreative(text) || /\b(idea|variant|hook|prompt|creative|story)\b/.test(userText))
    return CREATIVE_SUGGESTIONS
  if (isDocumentWorthy(text) || /\b(document|note|write|save|summary)\b/.test(userText))
    return DOCUMENT_SUGGESTIONS

  return DEFAULT_SUGGESTIONS
}
