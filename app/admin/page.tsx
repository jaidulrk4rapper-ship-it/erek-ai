"use client"

import { useState, useCallback } from "react"
import Link from "next/link"

type Session = { id: string; created_at: number; title: string; pinned: boolean }
type Message = { role: string; content: string }

export default function AdminPage() {
  const [secret, setSecret] = useState("")
  const [token, setToken] = useState("")
  const [sessions, setSessions] = useState<Session[]>([])
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {}

  const loadSessions = useCallback(async () => {
    if (!token) return
    setError("")
    setLoading(true)
    setMessages(null)
    try {
      const res = await fetch("/api/admin/sessions", { headers: authHeader })
      if (res.status === 401) {
        setError("Invalid secret")
        setSessions([])
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setSessions(data.sessions || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load sessions")
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadMessages = useCallback(
    async (id: string) => {
      if (!token) return
      setError("")
      try {
        const res = await fetch(`/api/admin/session/${id}/messages`, {
          headers: authHeader,
        })
        if (res.status === 401) {
          setError("Invalid secret")
          return
        }
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load")
        setMessages(data.messages || [])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load messages")
        setMessages(null)
      }
    },
    [token]
  )

  const deleteSession = useCallback(
    async (id: string) => {
      if (!token || !confirm("Delete this session?")) return
      try {
        const res = await fetch(`/api/admin/session/${id}`, {
          method: "DELETE",
          headers: authHeader,
        })
        if (res.status === 401) {
          setError("Unauthorized")
          return
        }
        if (!res.ok) throw new Error("Delete failed")
        setSessions((prev) => prev.filter((s) => s.id !== id))
        setMessages(null)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Delete failed")
      }
    },
    [token]
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">EreK Admin</h1>
        <Link href="/chat" className="text-sm text-zinc-400 hover:text-white mb-4 inline-block">
          ← Back to chat
        </Link>

        {!token ? (
          <div className="space-y-2">
            <label className="block text-sm text-zinc-400">Admin secret</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setToken(secret)}
              className="w-full max-w-md px-3 py-2 rounded bg-[#1e1e1e] border border-white/10 text-white"
              placeholder="ADMIN_SECRET"
            />
            <button
              type="button"
              onClick={() => setToken(secret)}
              className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setToken("")}
              className="text-sm text-zinc-400 hover:text-white mb-4"
            >
              Change secret
            </button>
            <div className="mb-4">
              <button
                type="button"
                onClick={loadSessions}
                disabled={loading}
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
              >
                {loading ? "Loading…" : "Load sessions (last 50)"}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4">Title</th>
                    <th className="text-left py-2 pr-4">ID</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="py-2 pr-4 max-w-[200px] truncate" title={s.title}>
                        {s.title || "—"}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-zinc-500">{s.id}</td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => loadMessages(s.id)}
                          className="text-zinc-400 hover:text-white mr-3"
                        >
                          Messages
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSession(s.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {messages !== null && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <h2 className="text-lg font-medium mb-2">Messages (last 200)</h2>
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.map((m, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-zinc-500 font-mono mr-2">{m.role}:</span>
                      <span className="text-zinc-300 break-words">{m.content.slice(0, 200)}{m.content.length > 200 ? "…" : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
