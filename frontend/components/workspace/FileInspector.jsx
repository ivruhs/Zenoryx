"use client";

import { useEffect, useMemo, useRef } from "react";
import { Braces, ExternalLink, MessageSquareText } from "lucide-react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { LangDot } from "@/components/ui/LanguageBar";
import { cn, githubBlobUrl } from "@/lib/format";
import { langMeta } from "@/lib/languages";
import { useFileChunks, useFiles } from "./hooks";

const NODE_LABELS = {
  window: "line window",
  module: "module scope",
  group: "grouped declarations",
  lexical_declaration: "const declaration",
  variable_declaration: "var declaration",
};

function nodeLabel(type) {
  if (!type) return "chunk";
  return NODE_LABELS[type] || type.replace(/_/g, " ");
}

/** Shows how Tree-sitter split one file into semantic chunks. */
export function FileInspector({ project, path, focusLine, onAsk }) {
  const { data, isPending, isError } = useFileChunks(project.id, path);
  const { data: files = [] } = useFiles(project.id, true);
  const meta = files.find((f) => f.path === path);
  const refs = useRef({});
  const chunks = useMemo(() => data?.chunks || [], [data]);

  const focusIndex = useMemo(() => {
    if (!focusLine) return -1;
    return chunks.findIndex((c) => c.startLine <= focusLine && focusLine <= c.endLine);
  }, [chunks, focusLine]);

  useEffect(() => {
    if (focusIndex >= 0) refs.current[focusIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusIndex, path]);

  const lineCount = chunks.reduce((m, c) => Math.max(m, c.endLine || 0), 0);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-xs text-fg-subtle">
            <LangDot language={meta?.language || chunks[0]?.language} />
            {langMeta(meta?.language || chunks[0]?.language).label}
            {lineCount > 0 && <span>· {lineCount} lines</span>}
            <span>· {chunks.length} chunks</span>
          </div>
          <h2 className="break-all font-mono text-lg text-fg sm:text-xl">{path}</h2>
          {meta?.summary && <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-fg-muted">{meta.summary}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAsk(`Explain \`${path}\`: what it is responsible for, its key functions, and how it connects to the rest of the codebase.`)}>
              <MessageSquareText className="size-3.5" /> Ask about this file
            </button>
            <a className="btn btn-ghost btn-sm" href={githubBlobUrl(project, path)} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" /> GitHub
            </a>
          </div>
        </header>

        {isPending && (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton h-40" />
            ))}
          </div>
        )}
        {isError && <p className="text-sm text-coral">Couldn&apos;t load this file&apos;s chunks.</p>}

        <ol className="relative space-y-5">
          {chunks.map((c, i) => (
            <li key={c.id} ref={(el) => (refs.current[i] = el)} className="relative scroll-mt-4 pl-5">
              {/* AST boundary bracket */}
              <span
                className={cn(
                  "absolute bottom-0 left-0 top-0 w-2.5 rounded-l-md border-y border-l",
                  i === focusIndex ? "border-signal" : "border-[var(--line-strong)]",
                )}
              />
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px]">
                <span className={cn("rounded px-1.5 py-0.5", i === focusIndex ? "bg-signal text-signal-ink" : "bg-ink-800 text-fg-muted")}>#{c.chunkIndex}</span>
                <span className="inline-flex items-center gap-1 text-cyan/90">
                  <Braces className="size-3" />
                  {nodeLabel(c.nodeType)}
                </span>
                {c.symbol && <span className="truncate text-fg">{c.symbol}</span>}
                {c.startLine && (
                  <span className="text-fg-subtle">
                    L{c.startLine}–{c.endLine}
                  </span>
                )}
              </div>
              {c.summary && !/, lines \d+–\d+\.$/.test(c.summary) && (
                <p className="mb-2.5 text-[13px] leading-relaxed text-fg-muted">{c.summary}</p>
              )}
              <CodeBlock
                code={c.content}
                language={c.language || meta?.language}
                startLine={c.startLine || 1}
                showLineNumbers={Boolean(c.startLine)}
                highlight={i === focusIndex && focusLine ? [focusLine, focusLine] : undefined}
                maxHeight={460}
                title={`${path.split("/").pop()}${c.startLine ? `:${c.startLine}-${c.endLine}` : ""}`}
                actions={
                  <a
                    href={githubBlobUrl(project, path, c.startLine, c.endLine)}
                    target="_blank"
                    rel="noreferrer"
                    className="icon-btn size-7"
                    aria-label="Open these lines on GitHub"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                }
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
