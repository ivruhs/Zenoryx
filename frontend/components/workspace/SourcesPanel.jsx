"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink, ScanSearch, Scissors } from "lucide-react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { LangDot } from "@/components/ui/LanguageBar";
import { InlineCode } from "@/components/ui/InlineCode";
import { cn, githubBlobUrl } from "@/lib/format";

const TAPES = ["", "tape-pink", "tape-blue"];

function ScoreBar({ score, max }) {
  const pct = Math.max(8, Math.min(100, (score / (max || 1)) * 100));
  return (
    <span className="flex items-center gap-1.5" title={`Relevance ${score}`}>
      <span className="h-1.5 w-12 overflow-hidden rounded-full border border-ink/40 bg-paper">
        <span className="block h-full bg-blue" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-[10px] text-ink-3">{score.toFixed(2)}</span>
    </span>
  );
}

function SourceCard({ source, index, active, project, maxScore, onOpenInFile, innerRef }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);
  const name = source.filePath.split("/").pop();
  const dir = source.filePath.slice(0, -name.length);
  const r = active ? "0deg" : index % 2 ? "0.7deg" : "-0.7deg";

  return (
    <li
      ref={innerRef}
      style={{ "--r": r, "--tape-r": index % 2 ? "4deg" : "-3deg" }}
      className={cn(
        "tape scroll-mt-6 rotate-[var(--r)] rounded-xl border-[1.5px] bg-paper-2 transition-[rotate,box-shadow,border-color] duration-300",
        TAPES[index % TAPES.length],
        active ? "border-ink shadow-[5px_5px_0_0_var(--color-blue)]" : "border-ink/60",
      )}
    >
      <button type="button" onClick={() => setExpanded((e) => !e)} className="flex w-full items-start gap-3 p-3.5 pt-4 text-left" aria-expanded={expanded}>
        <span
          className={cn(
            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-mono text-[11px] font-bold",
            active ? "bg-blue text-paper-2" : "bg-pink text-ink",
          )}
        >
          {source.n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-mono text-[12px]">
            <LangDot language={source.language} />
            <span className="truncate">
              <span className="text-ink-3">{dir}</span>
              <span className="font-bold text-ink">{name}</span>
            </span>
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10.5px] text-ink-3">
            {source.startLine && (
              <span className="rounded bg-yellow-soft px-1 text-ink-2">
                L{source.startLine}–{source.endLine}
              </span>
            )}
            {source.symbol && <span className="max-w-[11rem] truncate text-ink-2">{source.symbol}</span>}
            {typeof source.score === "number" && <ScoreBar score={source.score} max={maxScore} />}
          </span>
        </span>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 text-ink-3 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="space-y-3 px-3.5 pb-3.5">
          {source.summary && (
            <p className="text-[13px] leading-relaxed text-ink-2">
              <span className="hand mr-1 text-base text-pink-deep">file role:</span>
              <InlineCode text={source.summary} />
            </p>
          )}
          {source.snippet && (
            <CodeBlock
              code={source.snippet}
              language={source.language}
              startLine={source.startLine || 1}
              showLineNumbers={Boolean(source.startLine)}
              maxHeight={280}
            />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary btn-sm flex-1 text-xs" onClick={() => onOpenInFile(source)}>
              <ScanSearch className="size-3.5" /> View in file
            </button>
            <a
              className="btn btn-ghost btn-sm text-xs"
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
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Scissors className="size-4" /> Clippings
            {sources.length > 0 && (
              <span className="sticker bg-yellow px-2 py-0 text-xs" style={{ "--r": "4deg" }}>
                {sources.length}
              </span>
            )}
          </h2>
          <span className="font-mono text-[10px] text-ink-3">cosine + identifier match</span>
        </div>
        {exchange?.question && <p className="mt-2 line-clamp-2 text-[13px] italic text-ink-3">for “{exchange.question}”</p>}
      </div>
      {sources.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
          <div className="relative mb-6">
            <div className="h-24 w-20 -rotate-6 rounded-lg border-[1.5px] border-dashed border-ink-3 bg-paper-2" />
            <div className="absolute left-6 top-3 h-24 w-20 rotate-6 rounded-lg border-[1.5px] border-ink bg-paper-2 ruled" />
            <Scissors className="absolute -right-6 top-9 size-7 -rotate-12 animate-wiggle text-pink-deep" style={{ "--r": "-12deg" }} />
          </div>
          <p className="font-display text-lg font-bold">No clippings yet</p>
          <p className="mt-1.5 max-w-[16rem] text-[14px] leading-relaxed text-ink-2">
            Ask something and the exact code behind the answer gets pinned up here.
          </p>
        </div>
      ) : (
        <ul className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-4">
          {sources.map((s, i) => (
            <SourceCard
              key={`${exchange.id}-${s.n}`}
              innerRef={(el) => (refs.current[s.n] = el)}
              source={s}
              index={i}
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
