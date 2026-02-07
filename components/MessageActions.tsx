"use client"

import { useState, useRef, useEffect } from "react"
import {
  FiCopy,
  FiCheck,
  FiThumbsUp,
  FiThumbsDown,
  FiRefreshCw,
  FiMoreHorizontal,
} from "react-icons/fi"

export interface MessageMeta {
  liked?: boolean | null
  copiedCount?: number
  regeneratedFromId?: string
  rawContent?: string
  pinned?: boolean
}

interface MessageActionsProps {
  messageId: string
  content: string
  rawContent?: string
  meta?: MessageMeta
  isLast: boolean
  onCopy: () => void
  onLike: (liked: boolean | null) => void
  onRegenerate?: () => void
  onCopyMarkdown: () => void
  onReport: () => void
  onShowRaw: (raw: string) => void
  onPin?: () => void
  onDelete?: () => void
  onToast: (message: string) => void
}

export default function MessageActions({
  messageId,
  content,
  rawContent,
  meta,
  isLast,
  onCopy,
  onLike,
  onRegenerate,
  onCopyMarkdown,
  onReport,
  onShowRaw,
  onPin,
  onDelete,
  onToast,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [menuOpen])

  const liked = meta?.liked ?? null

  const handleCopy = () => {
    onCopy()
    navigator.clipboard.writeText(content)
    setCopied(true)
    onToast("Copied")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(content)
    onToast("Copied as Markdown")
    setMenuOpen(false)
  }

  const handleReport = () => {
    onReport()
    onToast("Feedback saved")
    setMenuOpen(false)
  }

  const buttonClass =
    "p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"

  return (
    <div
      className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 sm:opacity-100"
      aria-label="Message actions"
    >
      <button
        type="button"
        onClick={handleCopy}
        className={buttonClass}
        aria-label="Copy"
        title="Copy"
      >
        {copied ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
      </button>

      <button
        type="button"
        onClick={() => { onLike(liked === true ? null : true); onToast("Feedback saved") }}
        className={`${buttonClass} ${liked === true ? "text-green-500 dark:text-green-400" : ""}`}
        aria-label="Like"
        title="Like"
      >
        <FiThumbsUp className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => { onLike(liked === false ? null : false); onToast("Feedback saved") }}
        className={`${buttonClass} ${liked === false ? "text-red-500 dark:text-red-400" : ""}`}
        aria-label="Dislike"
        title="Dislike"
      >
        <FiThumbsDown className="w-3.5 h-3.5" />
      </button>

      {isLast && onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className={buttonClass}
          aria-label="Regenerate"
          title="Regenerate"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={buttonClass}
          aria-label="More options"
          title="More"
          aria-expanded={menuOpen}
        >
          <FiMoreHorizontal className="w-3.5 h-3.5" />
        </button>
        {menuOpen && (
          <div
            className="absolute left-0 top-full mt-1 py-1 min-w-[160px] rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-10"
            role="menu"
          >
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t-lg"
              role="menuitem"
            >
              Copy as Markdown
            </button>
            <button
              type="button"
              onClick={handleReport}
              className={`w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 ${!(rawContent !== undefined && rawContent !== content) && !onPin && !onDelete ? "rounded-b-lg" : ""}`}
              role="menuitem"
            >
              Report
            </button>
            {rawContent !== undefined && rawContent !== content && (
              <button
                type="button"
                onClick={() => { onShowRaw(rawContent); setMenuOpen(false) }}
                className={`w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 ${!onPin && !onDelete ? "rounded-b-lg" : ""}`}
                role="menuitem"
              >
                Show raw response
              </button>
            )}
            {onPin && (
              <button
                type="button"
                onClick={() => { onPin(); setMenuOpen(false); onToast("Pinned") }}
                className={`w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 ${!onDelete ? "rounded-b-lg" : ""}`}
                role="menuitem"
              >
                Pin message
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => { onDelete(); setMenuOpen(false); onToast("Deleted locally") }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-b-lg"
                role="menuitem"
              >
                Delete locally
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
