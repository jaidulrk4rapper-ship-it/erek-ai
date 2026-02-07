"use client"

import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import type { Components } from "react-markdown"

const components: Components = {
  code(props) {
    const { node, className, children, inline, ...rest } = props as typeof props & { inline?: boolean }
    const match = /language-(\w+)/.exec(className || "")
    return !inline && match ? (
      <SyntaxHighlighter
        style={oneDark as Record<string, import("react").CSSProperties>}
        language={match[1]}
        PreTag="div"
        customStyle={{ margin: "0.5rem 0", borderRadius: "0.5rem", fontSize: "0.875rem" }}
        codeTagProps={{ style: { fontFamily: "inherit" } }}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-700" {...rest}>
        {children}
      </code>
    )
  },
}

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-body text-[15px] leading-relaxed [&_p]:my-1 [&_ul]:my-2 [&_ol]:my-2 [&_pre]:my-2">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  )
}
