"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, CornerDownLeft, RotateCcw, Scissors, Square } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { Markdown } from "@/components/ui/Markdown";
import { CopyButton } from "@/components/ui/CodeBlock";
import { Spinner } from "@/components/ui/Spinner";
import { cn, duration, formatCount } from "@/lib/format";
import { useFiles } from "./hooks";

/** Pairs persisted messages into question/answer exchanges. */
export function toExchanges(messages) {
  const out = [];
  let pendingQ = null;
  for (const m of messages) {
    if (m.role === "user") pendingQ = m;
    else if (m.role === "assistant") {
      out.push({
        id: m.id,
        question: pendingQ?.content || "",
        answer: m.content,
        sources: Array.isArray(m.sources) ? m.sources : [],
        latencyMs: m.latencyMs,
        model: m.model,
        phase: "done",
      });
      pendingQ = null;
    }
  }
  return out;
}

const PHASES = [
  { id: "retrieving", label: "Embedding your question" },
  { id: "search", label: "Hunting through the clippings" },
  { id: "generating", label: "Pasting an answer together" },
];

function RetrievalTrace({ phase, sourceCount, firstSourceMs }) {
  const step = phase === "retrieving" ? 0 : 2;
  return (
    <ol className="space-y-1.5 font-mono text-[12px]" aria-live="polite">
      {PHASES.map((p, i) => {
        const done = phase === "retrieving" ? false : i < 2;
        const active = phase === "retrieving" ? i <= 1 : i === step;
        return (
          <li key={p.id} className={cn("flex items-center gap-2", done ? "text-ink-2" : active ? "text-ink" : "text-ink-4")}>
            {done ? (
              <Check className="size-3.5 text-green" strokeWidth={3} />
            ) : active ? (
              <Spinner className="size-3.5 text-pink-deep" />
            ) : (
              <span className="mx-1 size-1.5 rounded-full bg-current" />
            )}
            {p.label}
            {p.id === "search" && done && sourceCount > 0 && (
              <span className="text-ink-3">
                — found {sourceCount}
                {firstSourceMs ? ` in ${duration(Math.round(firstSourceMs))}` : ""}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SourceChips({ sources, active, onCite }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-5 border-t-2 border-dashed border-ink-4 pt-4">
      <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-3">
        <Scissors className="size-3.5" /> clipped from
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) => (
          <button
            key={s.n}
            type="button"
            onClick={() => onCite(s.n)}
            style={{ "--r": `${i % 2 ? 1 : -1}deg` }}
            className={cn(
              "inline-flex h-7 max-w-[16rem] rotate-[var(--r)] items-center gap-1.5 rounded-md border-[1.5px] px-2 font-mono text-[11px] transition-[rotate,translate] duration-200 hover:-translate-y-0.5 hover:rotate-0",
              active === s.n ? "border-ink bg-blue text-paper-2" : "border-ink/70 bg-paper-2 text-ink-2 hover:border-ink",
            )}
            title={`${s.filePath}${s.startLine ? `:${s.startLine}-${s.endLine}` : ""}`}
          >
            <span className={cn("grid size-4 place-items-center rounded-full text-[10px] font-bold", active === s.n ? "bg-paper-2 text-blue" : "bg-pink text-ink")}>
              {s.n}
            </span>
            <span className="truncate">{s.filePath.split("/").pop()}</span>
            {s.startLine && <span className="opacity-60">:{s.startLine}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

const Exchange = memo(function Exchange({ ex, focused, activeCite, onCiteFor, onRetryFor, live }) {
  const onCite = (n) => onCiteFor(ex.id, n);
  const onRetry = () => onRetryFor(ex.question);
  const streaming = live && (ex.phase === "streaming" || ex.phase === "generating");
  const meta = [ex.latencyMs ? duration(ex.latencyMs) : null, ex.model || null].filter(Boolean);

  return (
    <article className="animate-fade-up">
      <div className="mb-3 flex items-start gap-3">
        <span className="hand mt-0.5 shrink-0 -rotate-6 text-xl text-pink-deep">you asked</span>
        <h3 className="font-display text-[19px] font-semibold leading-snug tracking-[-0.015em] text-ink">{ex.question}</h3>
      </div>
      <div
        className={cn(
          "rounded-2xl border-[1.5px] bg-paper-2 p-5 transition-[border-color,box-shadow] duration-300 sm:p-6",
          focused ? "border-ink shadow-[5px_5px_0_0_var(--color-blue)]" : "border-[var(--line-strong)]",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <LogoMark className="size-6 shrink-0" />
            <span className="font-display font-bold">zenoryx</span>
            {meta.length > 0 && <span className="truncate font-mono text-[11px] text-ink-3">· {meta.join(" · ")}</span>}
          </div>
          {ex.phase === "done" && ex.answer && <CopyButton text={ex.answer} className="-my-1" />}
        </div>

        {live && (ex.phase === "retrieving" || ex.phase === "generating") && !ex.answer && (
          <RetrievalTrace phase={ex.phase} sourceCount={ex.sources?.length || 0} firstSourceMs={ex.firstSourceMs} />
        )}

        {ex.answer && (
          <div className={cn(streaming && "[&>.md>*:last-child]:caret")}>
            <Markdown onCite={(n, o) => !o?.hover && onCite(n)} activeCite={focused ? activeCite : null} sourceCount={ex.sources?.length || 99}>
              {ex.answer}
            </Markdown>
          </div>
        )}

        {ex.phase === "error" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] border-pink-deep bg-pink-soft/60 px-4 py-3 text-sm">
            <span className="font-medium text-pink-deep">{ex.error}</span>
            <button type="button" className="btn btn-secondary btn-sm ml-auto" onClick={onRetry}>
              <RotateCcw className="size-3.5" /> Retry
            </button>
          </div>
        )}
        {ex.phase === "stopped" && <p className="hand mt-3 text-lg text-ink-3">— you stopped the press here</p>}

        {(ex.phase === "done" || (live && ex.sources?.length > 0)) && <SourceChips sources={ex.sources} active={focused ? activeCite : null} onCite={onCite} />}
      </div>
    </article>
  );
});

function suggestionsFor(project, files) {
  const repo = project.repoName;
  const base = [
    { title: "Architecture overview", q: `Give me an architecture overview of ${repo}: the main modules, how they fit together, and the entry point.` },
    { title: "Request / data flow", q: "Walk me through the main execution flow step by step, from the entry point to the core logic." },
    { title: "External dependencies", q: "Which external libraries, services, or APIs does this code depend on, and where are they used?" },
    { title: "Risks & edge cases", q: "Where is error handling done, and which edge cases or failure modes look unhandled?" },
  ];
  const codeFiles = files.filter((f) => f.language !== "markdown" && !/(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\./i.test(f.path));
  const withSymbols = codeFiles.filter((f) => f.symbols?.length);
  const symbolQs = withSymbols.slice(0, 2).map((f) => {
    const sym = f.symbols[0].split(",")[0].trim();
    return { title: `${sym}`, q: `How does \`${sym}\` in \`${f.path}\` work, and where is it used?`, mono: true };
  });
  return [...base.slice(0, 4 - symbolQs.length), ...symbolQs];
}

const CARD_STYLE = [
  { tape: "", r: "-1.2deg" },
  { tape: "tape-pink", r: "0.8deg" },
  { tape: "tape-blue", r: "1deg" },
  { tape: "", r: "-0.6deg" },
];

function EmptyState({ project, onAsk }) {
  const { data: files = [] } = useFiles(project.id, true);
  const suggestions = useMemo(() => suggestionsFor(project, files), [project, files]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col px-1 pt-6 sm:pt-12">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="stamp animate-stamp" style={{ "--stamp": "var(--color-green)", "--r": "-5deg" }}>
          Indexed
        </span>
        <span className="font-mono text-xs text-ink-3">
          {formatCount(project.chunkCount)} clippings from {project.fileCount} files
        </span>
      </div>
      <h2 className="font-display text-4xl font-extrabold leading-[1] tracking-[-0.045em] sm:text-[3.4rem]" style={{ fontVariationSettings: '"wdth" 85' }}>
        What do you want to know about <span className="marker misreg [overflow-wrap:anywhere]">{project.repoName}</span>?
      </h2>
      <p className="mt-4 max-w-xl text-[17px] text-ink-2">
        Every answer is pasted together from real code — tap a <span className="mx-0.5 inline-grid size-5 -translate-y-px place-items-center rounded-full border-[1.5px] border-ink bg-pink align-middle font-mono text-[10px] font-bold">1</span> sticker to see exactly which lines it came from.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {suggestions.map((s, i) => {
          const st = CARD_STYLE[i % CARD_STYLE.length];
          return (
            <button
              key={s.q}
              type="button"
              onClick={() => onAsk(s.q)}
              style={{ "--r": st.r }}
              className={cn(
                "tape ruled group rotate-[var(--r)] rounded-xl border-[1.5px] border-ink bg-paper-2 p-4 pt-5 text-left transition-[rotate,translate,box-shadow] duration-200 hover:-translate-y-1 hover:rotate-0 hover:shadow-[5px_5px_0_0_var(--color-ink)]",
                st.tape,
              )}
            >
              <div className={cn("mb-1.5 flex items-center justify-between gap-2 font-display text-[15px] font-bold", s.mono && "font-mono text-[14px]")}>
                <span className="truncate">{s.title}</span>
                <CornerDownLeft className="size-4 shrink-0 text-ink-4 transition-colors group-hover:text-pink-deep" />
              </div>
              <p className="line-clamp-2 text-[13.5px] leading-[32px] text-ink-2">{s.q}</p>
            </button>
          );
        })}
      </div>
      <p className="hand mt-8 self-end -rotate-2 text-xl text-ink-3">…or just type below ↓</p>
    </div>
  );
}

export function Composer({ onSubmit, onStop, busy, draft, setDraft, inputRef }) {
  const resize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };
  useEffect(() => resize(inputRef.current), [draft, inputRef]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    onSubmit(draft);
    setDraft("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="group relative rounded-2xl border-[1.5px] border-ink bg-paper-2 shadow-[4px_4px_0_0_var(--color-ink)] transition-shadow focus-within:shadow-[5px_5px_0_0_var(--color-blue)]"
    >
      <label htmlFor="ask" className="sr-only">
        Ask a question about this repository
      </label>
      <textarea
        id="ask"
        ref={inputRef}
        rows={1}
        value={draft}
        maxLength={2000}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about the architecture, a function, a bug…"
        className="block max-h-[200px] min-h-[56px] w-full resize-none bg-transparent px-4 pb-12 pt-4 text-[16px] leading-relaxed outline-none placeholder:text-ink-4"
      />
      <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between">
        <span className="hidden items-center gap-1.5 text-[11px] text-ink-3 sm:flex">
          <span className="kbd">↵</span> send <span className="kbd ml-1">⇧↵</span> new line <span className="kbd ml-1">/</span> focus
        </span>
        <span className="flex-1 sm:hidden" />
        {busy ? (
          <button type="button" onClick={onStop} className="grid size-9 place-items-center rounded-full border-[1.5px] border-ink bg-ink text-paper-2" aria-label="Stop generating">
            <Square className="size-3 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!draft.trim()}
            className="grid size-9 place-items-center rounded-full border-[1.5px] border-ink bg-pink text-ink transition-transform duration-200 hover:-rotate-12 hover:scale-105 disabled:border-ink-4 disabled:bg-paper-3 disabled:text-ink-4"
            aria-label="Send question"
          >
            <ArrowUp className="size-4" strokeWidth={2.75} />
          </button>
        )}
      </div>
    </form>
  );
}

export function ChatThread({ project, conversation, focus, onCite, inputRef, draft, setDraft }) {
  const { messages, live, ask, stop, busy, history } = conversation;
  const exchanges = useMemo(() => toExchanges(messages), [messages]);
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const all = live ? [...exchanges, { ...live, live: true }] : exchanges;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [all.length, live?.answer, live?.phase]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottom.current = nearBottom;
    setShowJump(!nearBottom);
  };

  const submit = useCallback(
    (q) => {
      stickToBottom.current = true;
      ask(q);
    },
    [ask],
  );

  // Stable callbacks so memoized exchanges don't re-render on every streamed frame.
  const latest = useRef({ onCite, conversation, submit });
  latest.current = { onCite, conversation, submit };
  const onCiteFor = useCallback((id, n) => latest.current.onCite(id, n), []);
  const onRetryFor = useCallback((question) => {
    latest.current.conversation.dismissLive();
    latest.current.submit(question);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="scroll-thin relative min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-8">
          {history.isPending ? (
            <div className="space-y-4 pt-10">
              <div className="skeleton h-7 w-2/3" />
              <div className="skeleton h-28 w-full" />
            </div>
          ) : all.length === 0 ? (
            <EmptyState project={project} onAsk={submit} />
          ) : (
            <div className="space-y-12">
              {all.map((ex) => (
                <Exchange
                  key={ex.id}
                  ex={ex}
                  live={ex.live}
                  focused={focus.messageId === ex.id}
                  activeCite={focus.messageId === ex.id ? focus.cite : null}
                  onCiteFor={onCiteFor}
                  onRetryFor={onRetryFor}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="relative shrink-0 px-4 pb-5 pt-1 sm:px-8">
        {showJump && (
          <button
            type="button"
            onClick={() => {
              stickToBottom.current = true;
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            }}
            className="sticker absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow"
            style={{ "--r": "-2deg" }}
          >
            Jump to latest ↓
          </button>
        )}
        <div className="mx-auto max-w-3xl">
          <Composer onSubmit={submit} onStop={stop} busy={busy} draft={draft} setDraft={setDraft} inputRef={inputRef} />
        </div>
      </div>
    </div>
  );
}
