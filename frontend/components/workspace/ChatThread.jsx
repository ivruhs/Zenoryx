"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, CornerDownLeft, RotateCcw, Square } from "lucide-react";
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
  { id: "retrieving", label: "Embedding question" },
  { id: "search", label: "Hybrid vector search" },
  { id: "generating", label: "Grounding answer" },
];

function RetrievalTrace({ phase, sourceCount, firstSourceMs }) {
  const step = phase === "retrieving" ? 1 : 3;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px]" aria-live="polite">
      {PHASES.map((p, i) => {
        const done = i < step - (phase === "retrieving" ? 0 : 1) || (phase !== "retrieving" && i < 2);
        const active = !done && (phase === "retrieving" ? i <= 1 : i === 2);
        return (
          <span key={p.id} className={cn("inline-flex items-center gap-1.5", done ? "text-fg-muted" : active ? "text-fg" : "text-fg-faint")}>
            {done ? <Check className="size-3 text-signal" /> : active ? <Spinner className="size-3 text-amber" /> : <span className="size-1 rounded-full bg-current" />}
            {p.label}
            {p.id === "search" && done && sourceCount > 0 && (
              <span className="text-fg-subtle">
                · {sourceCount} sources{firstSourceMs ? ` in ${duration(Math.round(firstSourceMs))}` : ""}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function SourceChips({ sources, active, onCite }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {sources.map((s) => (
        <button
          key={s.n}
          type="button"
          onClick={() => onCite(s.n)}
          className={cn(
            "inline-flex h-6 max-w-[16rem] items-center gap-1.5 rounded-md border px-1.5 font-mono text-[11px] transition-colors",
            active === s.n ? "border-signal/60 bg-signal/10 text-fg" : "hairline-strong bg-ink-900 text-fg-subtle hover:text-fg",
          )}
          title={`${s.filePath}${s.startLine ? `:${s.startLine}-${s.endLine}` : ""}`}
        >
          <span className={cn(active === s.n ? "text-signal" : "text-fg-muted")}>{s.n}</span>
          <span className="truncate">{s.filePath.split("/").pop()}</span>
          {s.startLine && <span className="text-fg-faint">:{s.startLine}</span>}
        </button>
      ))}
    </div>
  );
}

function Exchange({ ex, focused, activeCite, onCite, onRetry, live }) {
  const streaming = live && (ex.phase === "streaming" || ex.phase === "generating");
  const meta = [
    ex.sources?.length ? `${ex.sources.length} sources` : null,
    ex.latencyMs ? duration(ex.latencyMs) : null,
    ex.model || null,
  ].filter(Boolean);

  return (
    <article className="animate-fade-up">
      <h3 className="text-[17px] font-medium leading-snug tracking-[-0.01em] text-fg">{ex.question}</h3>
      <div className={cn("mt-4 rounded-xl border-l-2 pl-4 transition-colors sm:pl-5", focused ? "border-signal/70" : "border-[var(--line-strong)]")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-fg-subtle">
            <LogoMark className="size-4 shrink-0" />
            <span className="font-medium text-fg-muted">Zenoryx</span>
            {meta.length > 0 && <span className="truncate font-mono text-[11px]">· {meta.join(" · ")}</span>}
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
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-coral/25 bg-coral/[0.05] px-3 py-2.5 text-sm">
            <span className="text-coral">{ex.error}</span>
            <button type="button" className="btn btn-secondary btn-sm ml-auto" onClick={onRetry}>
              <RotateCcw className="size-3.5" /> Retry
            </button>
          </div>
        )}
        {ex.phase === "stopped" && <p className="mt-3 font-mono text-[11px] text-fg-subtle">— generation stopped</p>}

        {(ex.phase === "done" || (live && ex.sources?.length > 0)) && <SourceChips sources={ex.sources} active={focused ? activeCite : null} onCite={onCite} />}
      </div>
    </article>
  );
}

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

function EmptyState({ project, onAsk }) {
  const { data: files = [] } = useFiles(project.id, true);
  const suggestions = useMemo(() => suggestionsFor(project, files), [project, files]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col px-1 pt-6 sm:pt-14">
      <span className="eyebrow mb-4">Indexed · {formatCount(project.chunkCount)} chunks · {project.fileCount} files</span>
      <h2 className="text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[2.6rem]">
        What do you want to know
        <br />
        about <em className="font-serif font-normal italic text-signal">{project.repoName}</em>?
      </h2>
      <p className="mt-4 max-w-xl text-[15px] text-fg-muted">
        Answers are grounded in retrieved code and cite their sources — click any <span className="kbd mx-0.5">1</span> to see the exact lines.
      </p>
      <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s.q}
            type="button"
            onClick={() => onAsk(s.q)}
            className="group rounded-xl border hairline bg-ink-900 p-4 text-left transition-colors hover:border-white/15 hover:bg-ink-850"
          >
            <div className={cn("mb-1.5 flex items-center justify-between text-sm font-medium", s.mono && "font-mono")}>
              <span className="truncate">{s.title}</span>
              <CornerDownLeft className="size-3.5 shrink-0 text-fg-faint transition-colors group-hover:text-signal" />
            </div>
            <p className="line-clamp-2 text-[13px] leading-relaxed text-fg-subtle">{s.q}</p>
          </button>
        ))}
      </div>
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
      className="group relative rounded-2xl border hairline-strong bg-ink-900 shadow-[0_-12px_40px_-20px_rgba(0,0,0,0.8)] transition-colors focus-within:border-signal/40"
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
        placeholder="Ask about architecture, a function, a bug…"
        className="block max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-4 pb-11 pt-3.5 text-[15px] leading-relaxed outline-none placeholder:text-fg-faint"
      />
      <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between">
        <span className="hidden items-center gap-1.5 text-[11px] text-fg-faint sm:flex">
          <span className="kbd">↵</span> send <span className="kbd ml-1">⇧↵</span> newline
        </span>
        <span className="flex-1 sm:hidden" />
        {busy ? (
          <button type="button" onClick={onStop} className="grid size-8 place-items-center rounded-lg bg-ink-700 text-fg hover:bg-ink-600" aria-label="Stop generating">
            <Square className="size-3 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!draft.trim()}
            className="grid size-8 place-items-center rounded-lg bg-signal text-signal-ink transition-opacity disabled:bg-ink-700 disabled:text-fg-faint"
            aria-label="Send question"
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
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

  const submit = (q) => {
    stickToBottom.current = true;
    ask(q);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="scroll-thin relative min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-8">
          {history.isPending ? (
            <div className="space-y-4 pt-10">
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-24 w-full" />
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
                  activeCite={focus.cite}
                  onCite={(n) => onCite(ex.id, n)}
                  onRetry={() => {
                    conversation.dismissLive();
                    submit(ex.question);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="relative shrink-0 px-4 pb-4 sm:px-8">
        {showJump && (
          <button
            type="button"
            onClick={() => {
              stickToBottom.current = true;
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            }}
            className="chip absolute -top-10 left-1/2 -translate-x-1/2 bg-ink-800 text-fg-muted shadow-lg hover:text-fg"
          >
            Jump to latest
          </button>
        )}
        <div className="mx-auto max-w-3xl">
          <Composer onSubmit={submit} onStop={stop} busy={busy} draft={draft} setDraft={setDraft} inputRef={inputRef} />
        </div>
      </div>
    </div>
  );
}
