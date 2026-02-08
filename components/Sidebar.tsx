"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { FiMessageSquare, FiMoreVertical, FiShare2, FiEdit2, FiMapPin, FiTrash2, FiSearch } from "react-icons/fi"
import UserMenu from "./UserMenu"

function NotebookPenIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="6" y1="4" x2="6" y2="20" strokeWidth="2" />
      <path d="M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6" strokeWidth="1.5" />
      <line x1="9" y1="8" x2="16" y2="8" />
      <line x1="9" y1="12" x2="16" y2="12" />
      <path d="M15 5l4 4-8 8-2.5-.5L15 5z" strokeWidth="1.5" />
      <line x1="18" y1="7" x2="19" y2="8" strokeWidth="1.2" />
    </svg>
  )
}

export interface SessionItem {
  id: string
  created_at: number
  title?: string
  pinned?: boolean
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  sessionId: string | null
  sessions: SessionItem[]
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onRefreshSessions: () => void
  onSessionDeleted?: (id: string) => void
}

export default function Sidebar({
  isOpen,
  onToggle,
  sessionId,
  sessions,
  onNewChat,
  onSelectSession,
  onRefreshSessions,
  onSessionDeleted,
}: SidebarProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const triggerRef = useRef<HTMLElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const closeMenu = () => {
    setMenuOpenId(null)
    setMenuPosition(null)
    setRenameValue("")
    triggerRef.current = null
  }

  useEffect(() => {
    if (!menuOpenId) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return
      closeMenu()
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [menuOpenId])

  useEffect(() => {
    if (editingSessionId) renameInputRef.current?.focus()
  }, [editingSessionId])

  const handleShare = async (session: SessionItem) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/chat?sid=${session.id}`
    const text = `${session.title ?? "Chat"}\n${url}`
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: session.title ?? "EreK Chat",
            text: session.title ?? "EreK Chat",
            url,
          })
          setShareFeedback("Shared!")
        } catch {
          await navigator.clipboard.writeText(text)
          setShareFeedback("Link copied!")
        }
      } else {
        await navigator.clipboard.writeText(text)
        setShareFeedback("Link copied!")
      }
      setTimeout(() => setShareFeedback(null), 2000)
    } catch {
      setShareFeedback("Could not share")
      setTimeout(() => setShareFeedback(null), 2000)
    }
    closeMenu()
  }

  const startRename = (session: SessionItem) => {
    closeMenu()
    setEditingSessionId(session.id)
    setRenameValue(session.title ?? "New chat")
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  const submitRename = () => {
    const id = editingSessionId
    const title = renameValue.trim()
    if (!id || !title) {
      setEditingSessionId(null)
      return
    }
    setEditingSessionId(null)
    fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to rename")
        onRefreshSessions()
      })
      .catch(() => alert("Could not rename. Please try again."))
  }

  const cancelRename = () => {
    setEditingSessionId(null)
    setRenameValue("")
  }

  const handlePin = (session: SessionItem) => {
    fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !session.pinned }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Pin failed")
        onRefreshSessions()
        closeMenu()
      })
      .catch(() => {
        alert("Could not pin. Please try again.")
        closeMenu()
      })
  }

  const handleDelete = (session: SessionItem) => {
    if (!confirm("Delete this chat? This cannot be undone.")) {
      closeMenu()
      return
    }
    fetch(`/api/sessions/${session.id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Delete failed")
        onSessionDeleted?.(session.id)
        onRefreshSessions()
        closeMenu()
      })
      .catch(() => {
        alert("Could not delete. Please try again.")
        closeMenu()
      })
  }

  return (
    <div className="w-64 min-w-64 h-full flex flex-col bg-[#121212] text-white">
      {/* New chat button + Sessions List (EreK + toggle are in ChatUI top row) */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-1"
        onScroll={menuOpenId ? closeMenu : undefined}
      >
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition hover:bg-white/10"
          aria-label="New chat"
        >
          <NotebookPenIcon className="w-4 h-4 shrink-0 opacity-90" />
          New chat
        </button>
        <div className="relative rounded-lg transition hover:bg-white/10">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none bg-transparent border-none rounded-lg"
            aria-label="Search chats"
          />
        </div>
        <div className="text-xs text-gray-400 px-3 py-2">Your Chats</div>
        {(() => {
          const q = searchQuery.trim().toLowerCase()
          const filtered = q
            ? sessions.filter((s) => (s.title ?? "New chat").toLowerCase().includes(q))
            : sessions
          const toShow = filtered.slice(0, 20)
          return (
            <>
              {toShow.map((session) =>
          session.id === editingSessionId ? (
            <div
              key={session.id}
              className="rounded-lg bg-white/10 p-2 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRename()
                  if (e.key === "Escape") cancelRename()
                }}
                className="w-full px-2 py-1.5 rounded bg-[#1e1e1e] border border-white/20 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/30"
                placeholder="Chat name"
              />
              <div className="flex gap-1 justify-end">
                <button
                  type="button"
                  onClick={cancelRename}
                  className="px-2 py-1 text-xs rounded hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitRename}
                  className="px-2 py-1 text-xs rounded bg-white/20 hover:bg-white/30"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              key={session.id}
              className={`
                group flex items-center gap-1 rounded-lg hover:bg-white/15 transition
                ${session.id === sessionId ? "bg-white/10" : ""}
              `}
            >
              <button
                type="button"
                onClick={() => onSelectSession(session.id)}
                className="flex-1 min-w-0 text-left px-3 py-2 flex items-center gap-3 text-sm truncate"
                title={session.id}
              >
                <FiMessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{session.title ?? "New chat"}</span>
              </button>
              <div className="relative shrink-0 pr-1">
                <button
                  type="button"
                  ref={(el) => {
                    if (menuOpenId === session.id && el) triggerRef.current = el
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (menuOpenId === session.id) {
                      closeMenu()
                      return
                    }
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setMenuPosition({
                      top: rect.bottom + 4,
                      left: Math.max(8, rect.right - 160),
                    })
                    triggerRef.current = e.currentTarget as HTMLElement
                    setMenuOpenId(session.id)
                  }}
                  className="p-1.5 rounded hover:bg-white/15 text-gray-400 hover:text-white transition"
                  aria-label="Options"
                >
                  <FiMoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        )}
              {toShow.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-500">
                  {q ? "No chats match your search" : "No conversations yet"}
                </p>
              )}
            </>
          )
        })()}
        {shareFeedback && (
          <p className="px-3 py-2 text-xs text-green-400 animate-pulse">{shareFeedback}</p>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 p-2">
        <UserMenu />
      </div>

      {/* Dropdown in portal so it is not clipped by sidebar overflow */}
      {menuOpenId &&
        menuPosition &&
        typeof document !== "undefined" &&
        (() => {
          const session = sessions.find((s) => s.id === menuOpenId)
          if (!session) return null
          return createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] min-w-[160px] rounded-lg bg-[#1e1e1e] border border-white/10 py-1 shadow-xl text-white"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleShare(session)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                <FiShare2 className="w-4 h-4" /> Share
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  startRename(session)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                <FiEdit2 className="w-4 h-4" /> Rename
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePin(session)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                <FiMapPin className="w-4 h-4" /> {session.pinned ? "Unpin" : "Pin to chat"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(session)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10 text-red-400"
              >
                <FiTrash2 className="w-4 h-4" /> Delete
              </button>
            </div>,
            document.body
          )
        })()}
    </div>
  )
}
