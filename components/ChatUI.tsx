"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { FiMessageSquare, FiZap, FiBook, FiStar, FiHelpCircle, FiCode } from "react-icons/fi"
import Sidebar from "./Sidebar"

/** Panel/sidebar layout icon - central bar with two flanking bars (toggle sidebar) */
function SidebarPanelIcon({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Left panel */}
      <rect x="2" y="4" width="5" height="16" rx="2" fill="none" strokeWidth="2" />
      {/* Center panel (main) */}
      <rect x="9" y="3" width="6" height="18" rx="2" fill="none" strokeWidth="2" />
      {/* Right panel */}
      <rect x="17" y="4" width="5" height="16" rx="2" fill="none" strokeWidth="2" />
    </svg>
  )
}
import MessageBubble from "./MessageBubble"
import type { MessageBubbleMessage } from "./MessageBubble"
import type { SessionItem } from "./Sidebar"
import ChatInput from "./ChatInput"
import Toast from "./Toast"
import { getThinkingDelayMs } from "@/lib/thinking-delay"

const LIKES_STORAGE_KEY = "erek_message_likes"

type SuggestionType = "history" | "interesting" | "learn" | "story" | "idea"

/** Fun default prompts with type for icon */
const DEFAULT_SUGGESTIONS: { text: string; type: SuggestionType }[] = [
  { text: "Mujhe kuch interesting batao", type: "interesting" },
  { text: "Aaj kya seekhein? Suggest karo", type: "learn" },
  { text: "Koi surprising fact ya story sunao", type: "story" },
  { text: "Help me with a crazy idea", type: "idea" },
]

function SuggestionIcon({ type, text, className = "w-4 h-4 shrink-0 opacity-80" }: { type: SuggestionType; text: string; className?: string }) {
  if (type === "history") {
    const lower = text.toLowerCase()
    if (/\b(code|python|react|function|script|api|programming)\b/.test(lower)) return <FiCode className={className} />
    return <FiMessageSquare className={className} />
  }
  const icons = { interesting: FiZap, learn: FiBook, story: FiStar, idea: FiHelpCircle }
  const Icon = icons[type]
  return <Icon className={className} />
}

function getStoredLikes(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setStoredLike(messageId: string, liked: boolean | null) {
  const next = { ...getStoredLikes() }
  if (liked == null) delete next[messageId]
  else next[messageId] = liked
  try {
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(next))
  } catch {}
}

export default function ChatUI() {
  const [messages, setMessages] = useState<MessageBubbleMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pendingReplyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentAssistantIdRef = useRef<string | null>(null)
  const searchParams = useSearchParams()

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setToastVisible(true)
  }, [])

  useEffect(() => {
    if (!toastVisible) return
    const t = setTimeout(() => {
      setToastVisible(false)
      setToastMessage(null)
    }, 2500)
    return () => clearTimeout(t)
  }, [toastVisible, toastMessage])

  /** Suggestions: user's recent chat titles first, then fill with fun defaults; each with type for icon */
  const suggestionPrompts = useMemo(() => {
    const fromHistory = sessions
      .slice(0, 4)
      .map((s) => (s.title && s.title !== "New chat" ? s.title.trim() : null))
      .filter(Boolean) as string[]
    const used = new Set<string>()
    const result: { text: string; type: SuggestionType }[] = []
    fromHistory.forEach((t) => {
      if (t && !used.has(t.slice(0, 50))) {
        used.add(t.slice(0, 50))
        result.push({ text: t.length > 45 ? t.slice(0, 45) + "…" : t, type: "history" })
      }
    })
    DEFAULT_SUGGESTIONS.forEach((s) => {
      if (result.length >= 4) return
      if (!used.has(s.text.slice(0, 50))) {
        used.add(s.text.slice(0, 50))
        result.push(s)
      }
    })
    return result.length ? result : DEFAULT_SUGGESTIONS
  }, [sessions])

  const loadSessions = useCallback(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => d.sessions && setSessions(d.sessions))
      .catch(() => {})
  }, [])

  const loadSession = useCallback((id: string) => {
    setSessionId(id)
    localStorage.setItem("erek_session", id)
    const likes = getStoredLikes()
    fetch(`/api/sessions/${id}/messages`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.messages) {
          setMessages([])
          return
        }
        setMessages(
          (d.messages as { role: string; content: string }[]).map((m, i) => {
            const msgId = `s-${id}-${i}`
            return {
              role: m.role,
              content: m.content,
              id: msgId,
              meta: { liked: likes[msgId] ?? null },
            }
          })
        )
      })
      .catch(() => setMessages([]))
  }, [])

  useEffect(() => {
    const sid = searchParams.get("sid")
    if (sid) {
      loadSession(sid)
    } else {
      const saved = localStorage.getItem("erek_session")
      if (saved) setSessionId(saved)
    }
    loadSessions()
  }, [loadSessions, loadSession, searchParams])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = useCallback(
    async (messageText: string, isRegenerate?: boolean) => {
      const text = String(messageText ?? input ?? "").trim()
      if (!text || isStreaming) return

      if (!isRegenerate) setInput("")
      const userMsg: MessageBubbleMessage = {
        role: "user",
        content: text,
        id: crypto.randomUUID(),
      }
      const next: MessageBubbleMessage[] = isRegenerate
        ? [...messages.slice(0, -2), userMsg]
        : [...messages, userMsg]
      setMessages(next)
      setIsStreaming(true)
      scrollToBottom()

      const assistantMessage: MessageBubbleMessage = {
        role: "assistant",
        content: "",
        id: crypto.randomUUID(),
      }
      const thinkingStart = Date.now()
      const thinkingDelayMs = getThinkingDelayMs(text)
      currentAssistantIdRef.current = assistantMessage.id ?? null
      setMessages((prev) => [...prev, assistantMessage])

      abortRef.current = new AbortController()
      const signal = abortRef.current.signal

      const applyReply = (
        replyText: string,
        newSessionId: string | null,
        nextSteps?: string[]
      ) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.id !== currentAssistantIdRef.current || last?.role !== "assistant") return prev
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            ...last,
            content: replyText,
            nextSteps,
            meta: { ...last.meta, liked: last.meta?.liked ?? null },
          }
          return newMessages
        })
        if (newSessionId != null) {
          setSessionId(newSessionId)
          localStorage.setItem("erek_session", newSessionId)
          loadSessions()
        }
        scrollToBottom()
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId }),
          signal,
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          const errCode = data?.error || data?.userMessage || `Request failed (${response.status})`
          const detail = data?.detail ? ` — ${String(data.detail).slice(0, 200)}` : ""
          const status = data?.status != null ? ` [${data.status}]` : ""
          throw new Error(`${errCode}${status}${detail}`)
        }

        const reply = String(data?.text ?? data?.reply ?? "").trim()
        const elapsed = Date.now() - thinkingStart
        const wait = Math.max(0, thinkingDelayMs - elapsed)

        const nextSteps = Array.isArray(data?.nextSteps) ? data.nextSteps : undefined
        if (wait > 0) {
          pendingReplyTimeoutRef.current = setTimeout(() => {
            pendingReplyTimeoutRef.current = null
            applyReply(reply, data?.sessionId ?? null, nextSteps)
            setIsStreaming(false)
            abortRef.current = null
          }, wait)
        } else {
          applyReply(reply, data?.sessionId ?? null, nextSteps)
          setIsStreaming(false)
          abortRef.current = null
        }
      } catch (err: unknown) {
        if (pendingReplyTimeoutRef.current) {
          clearTimeout(pendingReplyTimeoutRef.current)
          pendingReplyTimeoutRef.current = null
        }
        if (err instanceof Error && err.name === "AbortError") {
          setMessages((prev) => {
            const newMessages = [...prev]
            const last = newMessages[newMessages.length - 1]
            if (last?.role === "assistant" && last?.content === "")
              return newMessages.slice(0, -1)
            return newMessages
          })
          currentAssistantIdRef.current = null
          return
        }
        const msg = err instanceof Error ? err.message : "Unknown error"
        setMessages((prev) => {
          const newMessages = [...prev]
          const last = newMessages[newMessages.length - 1]
          if (last?.role === "assistant" && last?.content === "") {
            newMessages[newMessages.length - 1] = { role: "assistant", content: `Error: ${msg}` }
            return newMessages
          }
          return [...newMessages, { role: "assistant", content: `Error: ${msg}` }]
        })
        scrollToBottom()
      } finally {
        if (!pendingReplyTimeoutRef.current) {
          setIsStreaming(false)
          abortRef.current = null
        }
      }
    },
    [messages, input, isStreaming, sessionId, loadSessions]
  )

  const regenerateResponse = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    if (!lastUser || isStreaming) return
    const content = typeof lastUser.content === "string" ? lastUser.content : String(lastUser.content ?? "")
    sendMessage(content, true)
  }, [messages, isStreaming, sendMessage])

  const handleLike = useCallback((messageId: string, liked: boolean | null) => {
    setStoredLike(messageId, liked)
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, meta: { ...m.meta, liked } } : m))
    )
  }, [])

  const handleNextStepSelect = useCallback((text: string) => {
    setInput(text)
  }, [])

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }, [])

  const handlePin = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, meta: { ...m.meta, pinned: !m.meta?.pinned } }
          : m
      )
    )
  }, [])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setSessionId(null)
    localStorage.removeItem("erek_session")
    loadSessions()
  }, [loadSessions])

  const handleStop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
  }, [])

  const toggleSidebar = () => setSidebarOpen((o) => !o)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0c0c0c]">
      {/* When closed: only a floating toggle icon on the left edge */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="fixed left-3 top-4 z-20 flex items-center justify-center w-7 h-7 rounded-lg bg-[#121212] text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <SidebarPanelIcon open={false} className="w-4 h-4" />
        </button>
      )}

      {/* Sidebar column: full width when open, 0 when closed */}
      <div
        className={`shrink-0 flex flex-col h-full overflow-hidden transition-[width] duration-300 ease-in-out bg-[#121212] ${
          sidebarOpen ? "w-64" : "w-0"
        }`}
      >
        {/* Top row: EreK left, open/close slider right */}
        <div
          className={`shrink-0 h-12 flex items-center border-b border-white/10 px-3 ${
            sidebarOpen ? "justify-between" : "justify-center"
          }`}
        >
          {sidebarOpen && (
            <button
              type="button"
              onClick={handleNewChat}
              className="font-semibold text-white hover:opacity-90 transition-opacity"
              aria-label="EreK - New chat"
              title="New chat"
            >
              EreK
            </button>
          )}
          {sidebarOpen && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <SidebarPanelIcon open={true} className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Sidebar content – visible when open */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {sidebarOpen && (
            <Sidebar
              isOpen={sidebarOpen}
              onToggle={toggleSidebar}
              sessionId={sessionId}
              sessions={sessions}
              onNewChat={handleNewChat}
              onSelectSession={loadSession}
              onRefreshSessions={loadSessions}
              onSessionDeleted={(id) => {
                if (id === sessionId) {
                  setSessionId(null)
                  setMessages([])
                  localStorage.removeItem("erek_session")
                }
              }}
            />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="flex-1 overflow-y-auto"
          onClick={(e) => {
            if (!sidebarOpen) return
            const t = e.target as HTMLElement
            if (t.closest("button") || t.closest("input") || t.closest("textarea") || t.closest("a")) return
            toggleSidebar()
          }}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">EreK</span>
              </div>
              <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
                How can I help you today?
              </h2>

              <div className="mt-6 flex flex-wrap justify-center gap-1.5 max-w-xl">
                {suggestionPrompts.map((item, i) => (
                  <button
                    key={`${i}-${item.text.slice(0, 20)}`}
                    type="button"
                    onClick={() => sendMessage(item.text)}
                    className="py-1.5 px-3 rounded-full border border-white/10 bg-[#121212] hover:bg-white/10 text-gray-200 transition inline-flex items-center gap-1.5 text-[12px] max-w-[240px] truncate"
                  >
                    <SuggestionIcon type={item.type} text={item.text} className="w-3 h-3 shrink-0" />
                    <span className="truncate">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id ?? idx}
                  message={msg}
                  messageIndex={idx}
                  isLast={idx === messages.length - 1}
                  onRegenerate={
                    idx === messages.length - 1 && msg.role === "assistant" && !isStreaming && messages.length >= 2
                      ? regenerateResponse
                      : undefined
                  }
                  onNextStepSelect={handleNextStepSelect}
                  onCopy={() => {}}
                  onLike={handleLike}
                  onToast={showToast}
                  onPin={handlePin}
                  onDelete={handleDeleteMessage}
                />
              ))}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 flex-shrink-0 mt-1" aria-hidden />
                  <div
                    className="flex items-center gap-2 rounded-none bg-white dark:bg-[#2A2A2A] px-4 py-3 shadow-none [font-family:var(--font-inter),var(--font-roboto),system-ui,sans-serif]"
                    aria-live="polite"
                    aria-label="Erek is thinking"
                  >
                    <span className="text-sm text-gray-500 dark:text-gray-400">Erek is thinking</span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => sendMessage(input)}
          isStreaming={isStreaming}
          onStop={handleStop}
        />

        <Toast message={toastMessage} visible={toastVisible} />
      </div>
    </div>
  )
}
