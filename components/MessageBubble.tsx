"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import type { MessageMeta } from "./MessageActions"
import MessageActions from "./MessageActions"
import NextSteps from "./NextSteps"
import { generateNextSteps } from "@/lib/next-steps"

export interface MessageBubbleMessage {
  role: string
  content: string
  sources?: string[]
  id?: string
  createdAt?: number
  meta?: MessageMeta
  rawContent?: string
  /** Topic-based next steps from Erek's reply; when set, used instead of heuristics */
  nextSteps?: string[]
}

interface MessageBubbleProps {
  message: MessageBubbleMessage
  isLast: boolean
  messageIndex: number
  onRegenerate?: () => void
  onNextStepSelect?: (text: string) => void
  onCopy?: (messageId: string) => void
  onLike?: (messageId: string, liked: boolean | null) => void
  onToast?: (message: string) => void
  onShowRaw?: (raw: string) => void
  onPin?: (messageId: string) => void
  onDelete?: (messageId: string) => void
}

export default function MessageBubble({
  message,
  isLast,
  messageIndex,
  onRegenerate,
  onNextStepSelect,
  onCopy,
  onLike,
  onToast,
  onShowRaw,
  onPin,
  onDelete,
}: MessageBubbleProps) {
  const [showRaw, setShowRaw] = useState(false)
  const messageId = message.id ?? `msg-${messageIndex}`
  const displayContent = showRaw && message.rawContent != null ? message.rawContent : message.content
  const nextStepSuggestions =
    message.role === "assistant" && message.content
      ? (message.nextSteps && message.nextSteps.length > 0
          ? message.nextSteps
          : generateNextSteps(message.content))
      : []

  const handleShowRaw = (raw: string) => {
    if (onShowRaw) onShowRaw(raw)
    else setShowRaw(true)
  }

  return (
    <div className={`group ${message.role === "user" ? "flex justify-end" : ""}`}>
      <div className={`flex gap-3 max-w-full ${message.role === "user" ? "flex-row-reverse" : ""}`}>
        <div className="w-8 h-8 flex-shrink-0 mt-1" aria-hidden />

        <div className="flex-1 min-w-0">
          <div
            className={`
            shadow-none
            ${message.role === "user"
              ? "rounded-2xl px-4 py-2 bg-gray-600/50 dark:bg-white/10 text-white ml-auto max-w-[80%] font-[system-ui] border-none shadow-none"
              : "bg-transparent px-0 py-0 text-gray-900 dark:text-gray-100 border-none [font-family:var(--font-inter),var(--font-roboto),system-ui,sans-serif] [&_*]:border-none [&_h1]:border-none [&_h2]:border-none [&_h3]:border-none [&_hr]:border-none [&_pre]:border-none"
            }
          `}
          >
            {message.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&_pre]:my-2 [&_p]:my-1.5 [&_p]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_ul]:leading-relaxed [&_ol]:leading-relaxed [&_li]:my-0.5 [&_*]:shadow-none [&_*]:border-none [&_h1]:border-0 [&_h2]:border-0 [&_h3]:border-0 [&_hr]:border-0 [&_h1]:my-2 [&_h2]:my-1.5 [&_h3]:my-1.5 text-[inherit] [text-shadow:none]">
                <ReactMarkdown
                  components={{
                    code(props) {
                      const { className, children, ...rest } = props
                      const inline = (props as { inline?: boolean }).inline
                      const match = /language-(\w+)/.exec(className || "")
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={oneDark as Record<string, import("react").CSSProperties>}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-lg my-2 !bg-[#282c34]"
                          customStyle={{ margin: "0.5rem 0", fontSize: "0.875rem" }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm"
                          {...rest}
                        >
                          {children}
                        </code>
                      )
                    },
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap font-[system-ui] leading-snug py-0.5">{message.content}</p>
            )}

            {message.role === "assistant" && message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sources</p>
                <ul className="text-xs space-y-1">
                  {message.sources.map((src, j) => (
                    <li key={j} className="truncate">{src}</li>
                  ))}
                </ul>
              </div>
            )}

            {message.role === "assistant" && nextStepSuggestions.length > 0 && onNextStepSelect && (
              <NextSteps
                suggestions={nextStepSuggestions}
                onSelect={onNextStepSelect}
              />
            )}
          </div>

          {message.role === "assistant" && (
            <MessageActions
              messageId={messageId}
              content={message.content}
              rawContent={message.rawContent}
              meta={message.meta}
              isLast={isLast}
              onCopy={() => onCopy?.(messageId)}
              onLike={(liked) => onLike?.(messageId, liked)}
              onRegenerate={isLast ? onRegenerate : undefined}
              onCopyMarkdown={() => {
                navigator.clipboard.writeText(message.content)
                onToast?.("Copied as Markdown")
              }}
              onReport={() => {}}
              onShowRaw={handleShowRaw}
              onPin={onPin ? () => onPin(messageId) : undefined}
              onDelete={onDelete ? () => onDelete(messageId) : undefined}
              onToast={onToast ?? (() => {})}
            />
          )}
        </div>
      </div>
    </div>
  )
}
