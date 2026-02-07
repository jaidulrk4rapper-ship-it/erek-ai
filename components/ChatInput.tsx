"use client"

import { useRef, useEffect, useCallback } from "react"
import { FiSquare } from "react-icons/fi"

function SendIcon({ className }: { className?: string }) {
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
      <path d="M12 19V5m0 0l-7 7m7-7l7 7" />
    </svg>
  )
}

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  onSend: () => void
  isStreaming: boolean
  onStop?: () => void
}

export default function ChatInput({
  input,
  setInput,
  onSend,
  isStreaming,
  onStop,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const focusInput = useCallback(() => {
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    if (!isStreaming) focusInput()
  }, [isStreaming, focusInput])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend()
      focusInput()
    }
  }

  const handleSendClick = () => {
    onSend()
    focusInput()
  }

  const handleStop = () => {
    onStop?.()
  }

  return (
    <div className="border-t border-white/10 bg-[#0c0c0c] p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message EreK..."
            disabled={isStreaming}
            rows={1}
            className="
              flex-1 resize-none rounded-full border border-white/10
              bg-[#1e1e1e] px-5 py-3 pr-12
              text-white placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20
              disabled:opacity-50 disabled:cursor-not-allowed
              max-h-32 overflow-y-auto
            "
            style={{ fontSize: "16px" }}
          />

          <button
            type="button"
            onClick={isStreaming ? handleStop : handleSendClick}
            disabled={!input.trim() && !isStreaming}
            className="
              absolute right-2 bottom-2
              flex items-center justify-center
              w-9 h-9 rounded-full
              bg-blue-600 hover:bg-blue-500 disabled:bg-white/10
              text-white disabled:text-gray-500
              transition-all duration-200
              disabled:cursor-not-allowed
              shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30
              ring-2 ring-blue-400/40 focus:ring-2 focus:ring-blue-400/60
              disabled:ring-0 disabled:shadow-sm
            "
            aria-label={isStreaming ? "Stop generating" : "Send message"}
          >
            {isStreaming ? (
              <FiSquare className="w-4 h-4" strokeWidth={2} />
            ) : (
              <SendIcon className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-2">
          EreK can make mistakes. Check important info.
        </p>
      </div>
    </div>
  )
}
