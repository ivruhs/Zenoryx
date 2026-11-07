"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink, ScanSearch, TextSearch } from "lucide-react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { LangDot } from "@/components/ui/LanguageBar";
import { cn, githubBlobUrl } from "@/lib/format";

function ScoreBar({ score, max }) {
  const pct = Math.max(6, Math.min(100, (score / (max || 1)) * 100));
  return (
    <span className="flex items-center gap-1.5" title={`Relevance ${score}`}>
      <span className="h-1 w-10 overflow-hidden rounded-full bg-ink-700">
        <span className="block h-full rounded-full bg-cyan/80" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-[10px] text-fg-faint">{score.toFixed(2)}</span>
    </span>
  );
}

function SourceCard({ source, active, project, maxScore, onOpenInFile, innerRef }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);
  const name = source.filePath.split("/").pop();
  const dir = source.filePath.slice(0, -name.length);
  return (
    <li
      ref={innerRef}
      className={cn(
        "scroll-mt-3 rounded-xl border bg-ink-900 transition-[border-color,box-shadow] duration-300",
        active ? "border-signal/50 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-signal)_10%,transparent)]" : "hairline",
      )}
    >
      <button type="button" onClick={() => setExpanded((e) => !e)} className="flex w-full items-start gap-3 p-3 text-left" aria-expanded={expanded}>
        <span
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md font-mono text-[11px] font-medium",
            active ? "bg-signal text-signal-ink" : "bg-ink-750 text-fg-muted",
          )}
        >
          {source.n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-mono text-[12px]">
            <LangDot language={source.language} />
            <span className="truncate">
              <span className="text-fg-subtle">{dir}</span>
              <span className="text-fg">{name}</span>
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px] text-fg-subtle">
            {source.startLine && (
              <span>
                L{source.startLine}–{source.endLine}
              </span>
            )}
            {source.symbol && <span className="max-w-[12rem] truncate text-fg-muted">{source.symbol}</span>}
            {typeof source.score === "number" && <ScoreBar score={source.score} max={maxScore} />}
          </span>
        </span>
        <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-fg-faint transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="space-y-3 px-3 pb-3">
          {source.summary && <p className="text-[12.5px] leading-relaxed text-fg-muted">{source.summary}</p>}
          {source.snippet && (
            <CodeBlock
              code={source.snippet}
              language={source.language}
              startLine={source.startLine || 1}
              showLineNumbers={Boolean(source.startLine)}
              maxHeight={280}
              className="text-[12px]"
            />
          )}
          <div className="flex gap-1.5">
            <button type="button" className="btn btn-secondary btn-sm h-7 flex-1 text-xs" onClick={() => onOpenInFile(source)}>
              <ScanSearch className="size-3.5" /> View in file
            </button>
            <a
              className="btn btn-ghost btn-sm h-7 text-xs"
              href={githubBlobUrl(project, source.filePath, source.startLine, source.endLine)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-3.5" /> GitHub
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

export function SourcesPanel({ exchange, activeCite, project, onOpenInFile }) {
  const refs = useRef({});
  const sources = exchange?.sources || [];
  const maxScore = sources.reduce((m, s) => Math.max(m, s.score || 0), 0);

  useEffect(() => {
    if (activeCite) refs.current[activeCite]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeCite, exchange?.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="eyebrow">Sources {sources.length > 0 && <span className="text-fg-faint">· {sources.length}</span>}</h2>
        <span className="font-mono text-[10px] text-fg-faint">cosine + lexical</span>
      </div>
      {exchange?.question && <p className="line-clamp-2 px-4 pb-3 text-[12.5px] text-fg-subtle">“{exchange.question}”</p>}
      {sources.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
          <span className="mb-4 grid size-11 place-items-center rounded-xl border hairline bg-ink-900">
            <TextSearch className="size-5 text-fg-subtle" />
          </span>
          <p className="text-sm text-fg-muted">Retrieved code appears here</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-subtle">
            Every answer is built from the chunks ranked most similar to your question. Click a citation to inspect it.
          </p>
        </div>
      ) : (
        <ul className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
          {sources.map((s) => (
            <SourceCard
              key={`${exchange.id}-${s.n}`}
              innerRef={(el) => (refs.current[s.n] = el)}
              source={s}
              active={activeCite === s.n}
              project={project}
              maxScore={maxScore}
              onOpenInFile={onOpenInFile}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
