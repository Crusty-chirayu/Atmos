"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Clean, safe Markdown renderer for ATMOS AI responses.
 * Renders bold highlights, structured headings, bullet/numbered lists,
 * inline code, tables, blockquotes, and sanitized links without raw asterisks.
 */
export function MarkdownMessage({
  content,
  className = "",
}: MarkdownMessageProps) {
  return (
    <div className={`markdown-chat-content text-xs leading-relaxed text-[#222222] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-[#111827]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#374151]">{children}</em>
          ),
          h1: ({ children }) => (
            <h3 className="text-sm font-bold text-[#111827] mt-3 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="text-xs font-bold text-[#111827] mt-2.5 mb-1 first:mt-0 uppercase tracking-wide">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="text-xs font-bold text-[#111827] mt-2 mb-1 first:mt-0">
              {children}
            </h5>
          ),
          h4: ({ children }) => (
            <h6 className="text-xs font-bold text-[#111827] mt-2 mb-1 first:mt-0">
              {children}
            </h6>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 space-y-1 marker:text-[#FFC928]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 space-y-1 marker:text-[#6B7280]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#FFC928] pl-3 py-1 my-2 text-[#4B5563] italic bg-[#FFFDE7]/40 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClass, children, ...props }) => {
            const isInline = !codeClass;
            return isInline ? (
              <code
                className="bg-[#F3F4F6] text-[#1F2937] px-1 py-0.5 rounded text-[11px] font-mono border border-[#E5E7EB]"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code className="text-[11px] font-mono text-[#1F2937]" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-[#F9FAFB] border border-[#E5E7EB] p-2.5 rounded-md my-2 overflow-x-auto text-[11px] font-mono">
              {children}
            </pre>
          ),
          a: ({ href, children }) => {
            const isSafeUrl =
              href &&
              (href.startsWith("http://") ||
                href.startsWith("https://") ||
                href.startsWith("mailto:"));
            return (
              <a
                href={isSafeUrl ? href : "#"}
                target={isSafeUrl ? "_blank" : undefined}
                rel={isSafeUrl ? "noopener noreferrer" : undefined}
                className="text-[#D97706] hover:text-[#B45309] underline font-medium"
              >
                {children}
              </a>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 border border-[#E5E7EB] rounded-md">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-[11px] text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#F9FAFB] text-[#374151] font-semibold">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-2.5 py-1.5 border-b border-[#E5E7EB]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 border-b border-[#F3F4F6]">
              {children}
            </td>
          ),
          hr: () => <hr className="my-3 border-[#E5E7EB]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
