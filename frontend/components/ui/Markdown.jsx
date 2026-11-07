"use client";

import { memo } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";
import { cn } from "@/lib/format";

/** Turns "[1]", "[2, 4]" and "[1][3]" into cite: links, skipping code spans/blocks. */
export function linkCitations(text, max = 99) {
  return text
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g)
    .map((part, i) => {
      if (i % 2 === 1) return part; // code — leave untouched
      return part.replace(/\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\](?!\()/g, (m, nums) =>
        nums
          .split(/\s*,\s*/)
          .map(Number)
          .filter((n) => n >= 1 && n <= max)
          .map((n) => `[${n}](cite:${n})`)
          .join("") || m,
      );
    })
    .join("");
}

const urlTransform = (url) => (url.startsWith("cite:") ? url : defaultUrlTransform(url));

function MarkdownImpl({ children, onCite, activeCite, sourceCount = 99, className }) {
  return (
    <div className={cn("md", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={urlTransform}
        components={{
          a({ href = "", children: kids, ...props }) {
            if (href.startsWith("cite:")) {
              const n = Number(href.slice(5));
              return (
                <button
                  type="button"
                  onClick={() => onCite?.(n)}
                  onMouseEnter={() => onCite?.(n, { hover: true })}
                  className={cn(
                    "mx-0.5 inline-flex h-[1.45em] min-w-[1.45em] -translate-y-[0.15em] items-center justify-center rounded-full border-[1.5px] border-ink px-1 align-middle font-mono text-[0.66em] font-bold transition-transform duration-200 hover:-rotate-12 hover:scale-110",
                    activeCite === n ? "bg-blue text-paper-2" : "bg-pink text-ink",
                  )}
                  aria-label={`Source ${n}`}
                >
                  {n}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
                {kids}
              </a>
            );
          },
          pre({ children: kids }) {
            return <>{kids}</>;
          },
          code({ className: cls, children: kids, ...props }) {
            const match = /language-([\w+#-]+)/.exec(cls || "");
            const text = String(kids ?? "");
            const isBlock = match || text.includes("\n");
            if (!isBlock) return <code {...props}>{kids}</code>;
            return (
              <CodeBlock
                code={text}
                language={match?.[1]}
                showLineNumbers={false}
                title={match?.[1] || "code"}
                className="my-3"
              />
            );
          },
        }}
      >
        {linkCitations(children || "", sourceCount)}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
