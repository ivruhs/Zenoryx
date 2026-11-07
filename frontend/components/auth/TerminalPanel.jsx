"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/format";

/* A replayed CLI session (timings taken from a real ingestion of expressjs/cors). */
const SCRIPT = [
  { kind: "cmd", text: "zenoryx index github.com/expressjs/cors" },
  { kind: "line", text: "resolved master@5317ebe · 8 files ranked · 0 skipped", tone: "muted" },
  { kind: "stage", name: "fetch", detail: "tree + raw CDN", time: "1.1s" },
  { kind: "stage", name: "parse", detail: "28 AST chunks · tree-sitter", time: "0.6s" },
  { kind: "stage", name: "summarize", detail: "7 files · gemini-2.5-flash-lite", time: "3.4s" },
  { kind: "stage", name: "embed", detail: "28 × 3072-d → pgvector", time: "3.2s" },
  { kind: "stage", name: "history", detail: "6 commits summarized", time: "5.9s" },
  { kind: "line", text: "ready in 14.2s", tone: "signal" },
  { kind: "gap" },
  { kind: "cmd", text: 'zenoryx ask "where is the preflight handled?"' },
  { kind: "line", text: "[1] lib/index.js:159-190 cors   [2] lib/index.js:36-92 configureOrigin", tone: "muted" },
  {
    kind: "stream",
    text: "Preflight requests are handled inside `cors()` when the method is OPTIONS [1]. It applies the origin, methods and credentials headers built by `configureOrigin` and `configureMethods` [2], then ends the response with 204 unless `preflightContinue` is set [1].",
  },
];

const CMD_CHAR = 38;
const STREAM_CHAR = 13;
const LINE_DELAY = 420;
const HOLD = 4500;

function schedule() {
  let t = 400;
  return SCRIPT.map((item) => {
    const start = t;
    if (item.kind === "cmd") t += item.text.length * CMD_CHAR + 350;
    else if (item.kind === "stream") t += item.text.length * STREAM_CHAR;
    else if (item.kind === "gap") t += 500;
    else t += LINE_DELAY;
    return { ...item, start, end: t };
  });
}

function Rich({ text }) {
  return text.split(/(`[^`]*`?|\[\d\])/g).map((part, i) =>
    part.startsWith("`") ? (
      <span key={i} className="text-fg">
        {part.replace(/`/g, "")}
      </span>
    ) : /^\[\d\]$/.test(part) ? (
      <span key={i} className="text-signal">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function TerminalPanel() {
  const items = useMemo(schedule, []);
  const total = items[items.length - 1].end + HOLD;
  const [t, setT] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(total - 1);
      return;
    }
    const startedAt = performance.now();
    const id = setInterval(() => setT((performance.now() - startedAt) % total), 33);
    return () => clearInterval(id);
  }, [total]);

  const lastStarted = items.filter((i) => i.start <= t).at(-1);

  return (
    <div className="panel-raised w-full max-w-[560px] overflow-hidden" aria-hidden="true">
      <div className="flex h-10 items-center gap-2 border-b hairline px-4">
        <span className="size-2.5 rounded-full bg-ink-600" />
        <span className="size-2.5 rounded-full bg-ink-600" />
        <span className="size-2.5 rounded-full bg-ink-600" />
        <span className="ml-3 font-mono text-[11px] text-fg-subtle">~/code — zenoryx</span>
      </div>
      <div className="h-[392px] overflow-hidden px-5 py-4 font-mono text-[12px] leading-[1.75]">
        {items
          .filter((i) => i.start <= t)
          .map((item, idx) => {
            const elapsed = t - item.start;
            if (item.kind === "gap") return <div key={idx} className="h-3" />;
            if (item.kind === "cmd") {
              const n = Math.min(item.text.length, Math.floor(elapsed / CMD_CHAR));
              const typing = n < item.text.length || item === lastStarted;
              return (
                <div key={idx} className="text-fg">
                  <span className="text-signal">❯</span> <span className={cn(typing && item === lastStarted && "caret")}>{item.text.slice(0, n)}</span>
                </div>
              );
            }
            if (item.kind === "stage")
              return (
                <div key={idx} className="flex gap-3 text-fg-muted">
                  <span className="text-signal">✓</span>
                  <span className="w-20 text-fg">{item.name}</span>
                  <span className="min-w-0 flex-1 truncate">{item.detail}</span>
                  <span className="text-fg-subtle tabular-nums">{item.time}</span>
                </div>
              );
            if (item.kind === "line")
              return (
                <div key={idx} className={cn("truncate", item.tone === "signal" ? "text-signal" : "text-fg-subtle")}>
                  {item.text}
                </div>
              );
            const n = Math.min(item.text.length, Math.floor(elapsed / STREAM_CHAR));
            return (
              <p key={idx} className={cn("mt-1 whitespace-normal text-fg-muted", n < item.text.length && "caret")}>
                <Rich text={item.text.slice(0, n)} />
              </p>
            );
          })}
      </div>
    </div>
  );
}
