/**
 * EreK response formatter: human, expressive, mood-aware.
 * STRICT: max 1–2 emojis, max 1–2 bold lines per message.
 * Strips any "Next step" block from the message body so only the bottom chip UI shows.
 */

import { shouldShowNextSteps } from "./next-steps"

const MAX_EMOJIS = 2
const MAX_BOLD_SEGMENTS = 2

/** Match a single emoji (Unicode property or common ranges). */
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu

/**
 * Count emojis in text.
 */
function countEmojis(text: string): number {
  const m = text.match(EMOJI_REGEX)
  return m ? m.length : 0
}

/**
 * Keep only the first `max` emojis; remove the rest.
 */
function capEmojis(text: string, max: number): string {
  if (max < 1) return text.replace(EMOJI_REGEX, "")
  let seen = 0
  return text.replace(EMOJI_REGEX, (match) => {
    seen += 1
    return seen <= max ? match : ""
  })
}

/**
 * Cap number of **...** bold segments. Keeps first `max` pairs, unbolds the rest.
 */
function capBoldSegments(text: string, max: number): string {
  if (max < 1) {
    return text.replace(/\*\*/g, "")
  }
  let count = 0
  return text.replace(/\*\*([^*]*)\*\*/g, (_, inner) => {
    count += 1
    if (count <= max) return `**${inner}**`
    return inner
  })
}

export type FormatErekContext = { userMessage?: string }

/**
 * Format a raw AI response for display: enforce max emojis and max bold segments.
 * If "Next step" section is missing, appends suggestions (optionally context-aware via context.userMessage).
 * Use this before sending any final AI message to the user.
 */
export function formatErekResponse(raw: string, context?: FormatErekContext): string {
  if (typeof raw !== "string" || !raw.trim()) return raw

  let out = raw.trim()

  if (countEmojis(out) > MAX_EMOJIS) {
    out = capEmojis(out, MAX_EMOJIS)
  }

  const boldCount = (out.match(/\*\*[^*]+\*\*/g) || []).length
  if (boldCount > MAX_BOLD_SEGMENTS) {
    out = capBoldSegments(out, MAX_BOLD_SEGMENTS)
  }

  out = out.replace(/\n{3,}/g, "\n\n").trim()

  if (!shouldShowNextSteps(out, context)) {
    out = out.replace(/\n\nNext step:\s*\n((?:[-*•]\s*(?:\(\d+\)\s*)?[^\n]*\n?)+)/gi, "").trim()
  }
  out = out.replace(/\n\nNext step:\s*\n((?:[-*•]\s*(?:\(\d+\)\s*)?[^\n]*\n?)+)/gi, "").trim()

  return out.trim()
}
