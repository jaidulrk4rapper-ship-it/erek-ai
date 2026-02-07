"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { FiCopy, FiCheck, FiRefreshCw } from "react-icons/fi"

export interface MessageBubbleMessage {
  role: string
  content: string
  sources?: string[]
}

interface MessageBubbleProps {
  message: MessageBubbleMessage
  isLast: boolean
  onRegenerate?: () => void
}

export default function MessageBubble({ message, isLast, onRegenerate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`group ${message.role === "user" ? "flex justify-end" : ""}`}>
      <div className={`flex gap-3 max-w-full ${message.role === "user" ? "flex-row-reverse" : ""}`}>
        {/* No icon for user; assistant also has no logo */}
        <div className="w-8 h-8 flex-shrink-0 mt-1" aria-hidden />

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div
            className={`
            shadow-none
            ${message.role === "user"
              ? "rounded-full px-4 py-3 bg-gray-600/50 dark:bg-white/10 text-white ml-auto max-w-[80%] font-[system-ui] border border-gray-500/50 dark:border-white/10"
              : "bg-transparent px-0 py-0 text-gray-900 dark:text-gray-100 border-none [font-family:var(--font-inter),var(--font-roboto),system-ui,sans-serif] [&_*]:border-none [&_h1]:border-none [&_h2]:border-none [&_h3]:border-none [&_hr]:border-none [&_pre]:border-none"
            }
          `}
          >
            {message.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:my-2 [&_p]:my-1 [&_ul]:my-2 [&_ol]:my-2 [&_*]:shadow-none [&_*]:border-none [&_h1]:border-0 [&_h2]:border-0 [&_h3]:border-0 [&_hr]:border-0 text-[inherit] [text-shadow:none]">
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
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap font-[system-ui]">{message.content}</p>
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
          </div>

          {/* Action Buttons (Assistant only) */}
          {message.role === "assistant" && (
            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={copyToClipboard}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400 flex items-center gap-1 text-xs"
                title="Copy response"
              >
                {copied ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              {isLast && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400 flex items-center gap-1 text-xs"
                  title="Regenerate response"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
