"use client";

import { useEffect, useMemo, useRef } from "react";
import { ExternalLink, MessageSquareText, Scissors } from "lucide-react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { InlineCode } from "@/components/ui/InlineCode";
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
      <div className="mx-auto max-w-4xl px-4 py-7 sm:px-8">
        <header className="mb-8">
          <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-xs text-ink-3">
            <LangDot language={meta?.language || chunks[0]?.language} />
            {langMeta(meta?.language || chunks[0]?.language).label}
            {lineCount > 0 && <span>· {lineCount} lines</span>}
            <span>
              · cut into <b className="text-ink">{chunks.length}</b> {chunks.length === 1 ? "piece" : "pieces"}
            </span>
          </div>
          <h2 className="break-all font-display text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{path}</h2>
          {meta?.summary && (
            <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-2">
              <span className="hand mr-1.5 text-xl text-pink-deep">tl;dr</span>
              <InlineCode text={meta.summary} />
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-yellow btn-sm"
              onClick={() => onAsk(`Explain \`${path}\`: what it is responsible for, its key functions, and how it connects to the rest of the codebase.`)}
            >
              <MessageSquareText className="size-3.5" /> Ask about this file
            </button>
            <a className="btn btn-ghost btn-sm" href={githubBlobUrl(project, path)} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" /> GitHub
            </a>
          </div>
        </header>

        {isPending && (
          <div className="space-y-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton h-40" />
            ))}
          </div>
        )}
        {isError && <p className="text-sm text-pink-deep">Couldn&apos;t load this file&apos;s chunks.</p>}

        <ol className="space-y-2">
          {chunks.map((c, i) => {
            const focused = i === focusIndex;
            return (
              <li key={c.id} ref={(el) => (refs.current[i] = el)} className="scroll-mt-4">
                {/* the cut */}
                <div className="flex items-center gap-2 py-3" aria-hidden={i === 0}>
                  <Scissors className={cn("size-4 shrink-0 -scale-x-100", focused ? "text-pink-deep" : "text-ink-3")} />
                  <span className={cn("h-0 flex-1 border-t-2 border-dashed", focused ? "border-pink" : "border-ink-4")} />
                  <span className="shrink-0 font-mono text-[11px] text-ink-3">
                    {c.startLine ? `L${c.startLine}–${c.endLine}` : `piece ${c.chunkIndex + 1}`}
                  </span>
                </div>
                <div>
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full border-[1.5px] border-ink font-mono text-[11px] font-bold",
                        focused ? "bg-pink" : "bg-paper-2",
                      )}
                    >
                      {c.chunkIndex + 1}
                    </span>
                    <span className="chip bg-blue-soft text-blue">{nodeLabel(c.nodeType)}</span>
                    {c.symbol && <span className="truncate font-mono text-[13px] font-bold text-ink">{c.symbol}</span>}
                  </div>
                  {c.summary && !/, lines \d+–\d+\.$/.test(c.summary) && (
                    <p className="mb-2.5 text-[14px] leading-relaxed text-ink-2">
                      <InlineCode text={c.summary} />
                    </p>
                  )}
                  <CodeBlock
                    code={c.content}
                    language={c.language || meta?.language}
                    startLine={c.startLine || 1}
                    showLineNumbers={Boolean(c.startLine)}
                    highlight={focused && focusLine ? [focusLine, focusLine] : undefined}
                    maxHeight={460}
                    className={cn("transition-shadow duration-300", focused && "offset-pink")}
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
                </div>
              </li>
            );
          })}
        </ol>
        {chunks.length > 0 && (
          <div className="flex items-center gap-2 py-6 text-ink-4" aria-hidden="true">
            <Scissors className="size-4 -scale-x-100" />
            <span className="h-0 flex-1 border-t-2 border-dashed border-ink-4" />
            <span className="hand text-lg text-ink-3">end of file</span>
          </div>
        )}
      </div>
    </div>
  );
}
