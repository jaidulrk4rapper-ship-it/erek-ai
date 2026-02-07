/**
 * Minimum "thinking" time (ms) before Erek's reply is shown.
 * Short/small prompts → brief delay (~0.3–1s).
 * Big/long prompts → longer delay (~1.5–5s).
 */

const SMALL_TALK_PATTERN = /^(hi|hello|hey|bye|good\s*(morning|night|day)|gm|gn|how\s*are\s*you|what'?s\s*up|sup|good|ok(ay)?|thanks?|date|what'?s\s*the\s*date|namaste|kaise\s*ho)[\s!?.]*$/i

const BIG_WORK_PATTERN = /\b(project|build|create|develop|plan|debug|code|video|image|app|implement|design|write\s+(a|the)|make\s+(a|me)|help\s+me)\b/i

/**
 * Returns minimum thinking time in ms. Use after user sends a message:
 * - Small talk / 1–2 words: 400–800 ms
 * - Short message: ~0.8–1.5 s
 * - Medium: ~1.5–3 s
 * - Long or "big work" keywords: ~2.5–5 s
 */
export function getThinkingDelayMs(message: string): number {
  const text = (message ?? "").trim()
  const len = text.length
  const lower = text.toLowerCase()

  if (len < 20 || SMALL_TALK_PATTERN.test(text)) return 400 + Math.random() * 400
  if (BIG_WORK_PATTERN.test(lower) || len > 200) return 2500 + Math.random() * 2500
  if (len > 100) return 1800 + Math.random() * 1200
  if (len > 50) return 1000 + Math.random() * 800

  return 700 + Math.random() * 500
}
