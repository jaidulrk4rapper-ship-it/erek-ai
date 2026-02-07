"use client"

interface ToastProps {
  message: string | null
  visible: boolean
}

export default function Toast({ message, visible }: ToastProps) {
  if (!visible || !message) return null

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm shadow-lg border border-white/10 transition-opacity duration-200"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
