"use client"

import { useState, useRef, useEffect } from "react"
import { signOut, useSession } from "next-auth/react"
import { FiLogOut, FiChevronUp } from "react-icons/fi"

export default function UserMenu() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [open])

  if (!session?.user) return null

  const name = session.user.name || "User"
  const email = session.user.email || ""
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{name}</p>
          <p className="text-xs text-gray-400 truncate">{email}</p>
        </div>
        <FiChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg bg-[#1e1e1e] border border-white/10 shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-white/10">
            <p className="text-sm text-white truncate">{name}</p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-white/10 transition-colors"
          >
            <FiLogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
