import { Suspense } from "react"
import ChatUI from "@/components/ChatUI"

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-zinc-400">Loading…</div>}>
      <ChatUI />
    </Suspense>
  )
}
