"use client"

interface NextStepsProps {
  suggestions: string[]
  onSelect: (text: string) => void
  sendImmediately?: boolean
}

export default function NextSteps({
  suggestions,
  onSelect,
}: NextStepsProps) {
  if (!suggestions || suggestions.length === 0) return null

  const list = suggestions.slice(0, 4)

  return (
    <div className="mt-4 pt-3 border-t border-sky-400/30 dark:border-sky-500/40">
      <p className="text-xs font-medium text-sky-600 dark:text-sky-400 mb-2">Next step</p>
      <div className="flex flex-wrap gap-2">
        {list.map((text, i) => (
          <button
            key={`${i}-${text.slice(0, 20)}`}
            type="button"
            onClick={() => onSelect(text)}
            className="
              px-3 py-1.5 rounded-full text-xs font-medium text-[rgba(255,255,255,1)]
              bg-sky-50/80 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/70
              border border-sky-300/60 dark:border-sky-500/60
              ring-1 ring-sky-200/50 dark:ring-sky-500/30
              hover:ring-sky-400/50 dark:hover:ring-sky-400/50
              focus:outline-none focus:ring-2 focus:ring-sky-400/60
              transition-colors
            "
            aria-label={`Suggestion: ${text}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
