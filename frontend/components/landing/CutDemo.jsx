"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { CodeText } from "./code";
import { SnippingScissors } from "./Doodles";

/* ---------------------------------------------------------------------------
 * The signature demo. Scissors travel down the dashed seams between
 * declarations, each cut piece lifts off into a taped "clippings" column,
 * a question is typed, and the answer streams in with citation stickers that
 * point back at the clippings they came from.
 * ------------------------------------------------------------------------- */

const CODE = [
  'import { createHmac } from "node:crypto";',
  'import { db } from "./db";',
  "",
  "const TTL = 7 * 24 * 3600 * 1000;",
  "const SECRET = process.env.COOKIE_SECRET;",
  "",
  "export function sign(raw: string) {",
  '  const mac = createHmac("sha256", SECRET);',
  '  return raw + "." + mac.update(raw)',
  '    .digest("hex");',
  "}",
  "",
  "export async function verify(cookie: string) {",
  '  const [raw] = cookie.split(".");',
  "  if (sign(raw) !== cookie) return null;",
  "  const s = await db.sessions.get(raw);",
  "  if (!s || s.expiresAt < Date.now()) {",
  "    return null;",
  "  }",
  "  return s.user;",
  "}",
  "",
  "export class SessionStore {",
  "  async create(userId: string) {",
  "    const token = crypto.randomUUID();",
  "    const expiresAt = Date.now() + TTL;",
  "    await db.sessions.put(token, expiresAt);",
  "    return sign(token);",
  "  }",
  "}",
];

// Chunks as the AST chunker would produce them. `n` = retrieval rank / citation number.
const CHUNKS = [
  { id: "a", start: 1, end: 5, node: "module scope", symbol: "imports + config", n: 4, color: "var(--color-yellow)", r: 2 },
  { id: "b", start: 7, end: 11, node: "function_declaration", symbol: "sign", n: 2, color: "var(--color-blue-soft)", r: -2.5 },
  { id: "c", start: 13, end: 21, node: "function_declaration", symbol: "verify", n: 1, color: "var(--color-pink-soft)", r: 1.5 },
  { id: "d", start: 23, end: 30, node: "class_declaration", symbol: "SessionStore", n: 3, color: "var(--color-green-soft)", r: -1 },
];
const SEAMS = [6, 12, 22]; // blank lines between declarations
const BY_RANK = [...CHUNKS].sort((a, b) => a.n - b.n);

const QUESTION = "How are session cookies verified?";
const ANSWER = [
  { code: "verify" },
  " splits the cookie and re-signs the raw token with ",
  { code: "sign" },
  " ",
  { cite: 1 },
  { cite: 2 },
  ", so a tampered cookie never matches. It then loads the session and rejects it once ",
  { code: "expiresAt" },
  " has passed ",
  { cite: 1 },
  " — sessions live for ",
  { code: "TTL" },
  " ",
  { cite: 4 },
  ", stamped when ",
  { code: "SessionStore.create" },
  " issues the token ",
  { cite: 3 },
  ".",
];

/** Flatten the answer into streamable units (words, code spans, citations). */
const UNITS = ANSWER.flatMap((part) =>
  typeof part === "string" ? part.split(/(?<=\s)/).map((w) => ({ text: w })) : [part],
);

const INITIAL = { phase: "idle", cut: -1, lifted: 0, typed: 0, streamed: 0, active: null };
const FINAL = {
  phase: "done",
  cut: SEAMS.length + 1,
  lifted: CHUNKS.length,
  typed: QUESTION.length,
  streamed: UNITS.length,
  active: 1,
};

/** Builds the whole animation as a list of timed state patches. */
function buildTimeline() {
  const ev = [];
  const at = (delay, patch) => ev.push({ delay, patch });
  at(900, { phase: "cut", cut: 0 });
  for (let i = 1; i <= SEAMS.length + 1; i++) at(820, { cut: i });
  for (let i = 1; i <= CHUNKS.length; i++) at(i === 1 ? 350 : 380, { phase: "lift", lifted: i });
  at(650, { phase: "ask" });
  for (let i = 1; i <= QUESTION.length; i++) at(42, { typed: i });
  at(500, { phase: "answer" });
  let lastCite = null;
  UNITS.forEach((u, i) => {
    if (u.cite) lastCite = u.cite;
    at(u.cite ? 160 : 70, { streamed: i + 1, active: lastCite });
  });
  at(1500, { active: 2 });
  at(1300, { active: 3 });
  at(1300, { active: 4 });
  at(1300, { active: 1, phase: "done" });
  at(2600, null); // reset
  return ev;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function useDemoState(rootRef) {
  const reduced = usePrefersReducedMotion();
  const timeline = useMemo(buildTimeline, []);
  const [state, setState] = useState(INITIAL);
  const [visible, setVisible] = useState(false);
  const index = useRef(0);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);

  useEffect(() => {
    if (reduced) {
      setState(FINAL);
      return;
    }
    if (!visible) return;
    let timer;
    const tick = () => {
      const ev = timeline[index.current];
      timer = setTimeout(() => {
        if (ev.patch === null) {
          setState(INITIAL);
          index.current = 0;
        } else {
          setState((s) => ({ ...s, ...ev.patch }));
          index.current += 1;
        }
        tick();
      }, ev.delay);
    };
    tick();
    return () => clearTimeout(timer);
  }, [visible, reduced, timeline]);

  return state;
}

/* ---------------------------------------------------------------------------- */

function CodeSheet({ state }) {
  // Scissors travel from above the first seam, through each seam, then off the page.
  const scissorRow = state.cut < 0 ? -1.5 : state.cut < SEAMS.length ? SEAMS[state.cut] - 0.5 : CODE.length + 1;
  const cutDone = (seamIdx) => state.cut > seamIdx;
  const chunkCut = (c) => state.cut > SEAMS.length - 1 || SEAMS.every((s, i) => s > c.end || cutDone(i));
  const lifted = (c) => BY_RANK.indexOf(c) < state.lifted;

  return (
    <div className="paper relative overflow-hidden [--lh:17px] [--pad:14px] sm:[--lh:21px] sm:[--pad:18px]">
      <div className="flex items-center justify-between border-b-[1.5px] border-dashed border-ink/25 px-4 py-2.5">
        <span className="font-mono text-[11px] text-ink-2 sm:text-xs">src/auth/session.ts</span>
        <span className="chip h-5 text-[10px]">typescript</span>
      </div>

      <div className="relative py-[var(--pad)] pl-9 pr-3 sm:pl-12 sm:pr-4">
        {/* chunk outlines (appear once the seams around them are cut) */}
        {CHUNKS.map((c) => {
          const show = state.phase !== "idle" && chunkCut(c);
          const active = state.active === c.n && (state.phase === "answer" || state.phase === "done");
          return (
            <div
              key={c.id}
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute left-7 right-2 rounded-lg border-[1.5px] transition-all duration-500 sm:left-10",
                show ? "opacity-100" : "opacity-0",
                lifted(c) ? "border-dashed border-ink/30" : "border-ink",
              )}
              style={{
                top: `calc(var(--pad) + (${c.start - 1} * var(--lh)) - 3px)`,
                height: `calc(${c.end - c.start + 1} * var(--lh) + 6px)`,
                background: lifted(c) ? (active ? "var(--color-yellow-soft)" : "transparent") : c.color,
                mixBlendMode: "multiply",
              }}
            >
              <span
                className={cn(
                  "absolute -top-2.5 right-2 rounded-full border border-ink bg-paper-2 px-1.5 font-mono text-[9px] leading-4 text-ink-2 transition-opacity sm:text-[10px]",
                  show && !lifted(c) ? "opacity-100" : "opacity-0",
                )}
              >
                {c.node} · L{c.start}–{c.end}
              </span>
            </div>
          );
        })}

        {/* seams */}
        {SEAMS.map((row, i) => (
          <div
            key={row}
            aria-hidden="true"
            className="absolute left-0 right-0 flex items-center"
            style={{ top: `calc(var(--pad) + (${row - 0.5} * var(--lh)))` }}
          >
            <div
              className={cn(
                "h-0 flex-1 border-t-2 border-dashed transition-colors duration-300",
                cutDone(i) ? "border-pink" : "border-ink/20",
              )}
            />
          </div>
        ))}

        {/* scissors */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute -left-1 z-10 w-9 transition-[top,opacity] duration-700 ease-[var(--ease-out-expo)] sm:left-0 sm:w-11",
            state.phase === "cut" ? "opacity-100" : "opacity-0",
          )}
          style={{ top: `calc(var(--pad) + (${scissorRow} * var(--lh)) - 14px)` }}
        >
          <SnippingScissors snipping={state.phase === "cut"} />
        </div>

        <pre className="relative font-mono text-[10.5px] leading-[var(--lh)] sm:text-[12.5px]" aria-label="Example TypeScript file">
          {CODE.map((line, i) => (
            <div key={i} className="flex">
              <span className="absolute -ml-7 w-5 select-none text-right text-blue/45 sm:-ml-9">{i + 1}</span>
              <span className="whitespace-pre">
                <CodeText line={line} />
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

function Clipping({ chunk, visible, active }) {
  const lines = CODE.slice(chunk.start - 1, chunk.start + 1);
  return (
    <li
      className={cn(
        "tape relative rounded-xl border-[1.5px] border-ink bg-paper-2 px-3 pb-2.5 pt-3 transition-[box-shadow,transform,opacity] duration-500",
        chunk.n % 2 ? "" : "tape-pink",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        active ? "shadow-[5px_5px_0_0_var(--color-pink)]" : "shadow-[2px_2px_0_0_rgba(31,28,23,0.15)]",
      )}
      style={{
        "--tape-r": `${chunk.r * 1.5}deg`,
        transform: visible ? `rotate(${active ? 0 : chunk.r}deg) ${active ? "scale(1.03)" : ""}` : `translateX(-40px) rotate(${chunk.r * 3}deg)`,
      }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-mono text-[10px] font-bold",
            active ? "bg-blue text-paper-2" : "bg-pink text-ink",
          )}
        >
          {chunk.n}
        </span>
        <span className="truncate font-display text-sm font-bold">{chunk.symbol}</span>
        <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-3">
          L{chunk.start}–{chunk.end}
        </span>
      </div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">{chunk.node}</p>
      <pre className="overflow-hidden font-mono text-[10px] leading-4 text-ink-2">
        {lines.map((l, i) => (
          <div key={i} className="truncate">
            <CodeText line={l} />
          </div>
        ))}
      </pre>
    </li>
  );
}

function Answer({ state }) {
  const units = UNITS.slice(0, state.streamed);
  const streaming = state.phase === "answer" && state.streamed < UNITS.length;
  return (
    <p className="text-[14px] leading-relaxed text-ink-2 sm:text-[15px]" aria-live="off">
      {units.map((u, i) =>
        u.cite ? (
          <span
            key={i}
            className={cn(
              "mx-[1px] inline-grid size-[1.35em] -translate-y-[0.12em] place-items-center rounded-full border-[1.5px] border-ink align-middle font-mono text-[0.68em] font-bold transition-colors",
              state.active === u.cite ? "bg-blue text-paper-2" : "bg-pink text-ink",
            )}
          >
            {u.cite}
          </span>
        ) : u.code ? (
          <code key={i} className="rounded-md border border-ink/20 bg-yellow-soft px-1 font-mono text-[0.85em] text-ink">
            {u.code}
          </code>
        ) : (
          <span key={i}>{u.text}</span>
        ),
      )}
      {streaming && <span className="caret" />}
    </p>
  );
}

export function CutDemo() {
  const rootRef = useRef(null);
  const state = useDemoState(rootRef);
  const answering = state.phase === "answer" || state.phase === "done";

  const caption =
    state.phase === "cut"
      ? "snip… cutting along the AST seams"
      : state.phase === "lift"
        ? "filing the pieces into the index"
        : state.phase === "ask" || answering
          ? "pasting the right pieces back together"
          : "a real-looking file, before the scissors";

  return (
    <div ref={rootRef} className="relative">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
        <CodeSheet state={state} />

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Clippings · ranked</span>
            <span className="hand text-lg text-pink-deep" aria-live="polite">
              {caption}
            </span>
          </div>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" aria-label="Retrieved chunks">
            {BY_RANK.map((c, i) => (
              <Clipping key={c.id} chunk={c} visible={i < state.lifted} active={answering && state.active === c.n} />
            ))}
          </ol>

          <div
            className={cn(
              "paper relative p-4 transition-opacity duration-500 sm:p-5",
              state.phase === "ask" || answering ? "opacity-100" : "opacity-40",
            )}
          >
            <div className="mb-3 flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-3 py-1.5 font-mono text-[12px] text-ink">
              <span className="text-pink-deep">?</span>
              <span className="min-w-0 truncate">
                {QUESTION.slice(0, state.typed) || <span className="text-ink-4">ask anything…</span>}
              </span>
              {state.phase === "ask" && <span className="caret" />}
            </div>
            {answering ? (
              <Answer state={state} />
            ) : (
              <div className="space-y-2" aria-hidden="true">
                <div className="h-2.5 w-11/12 rounded-full bg-paper-3" />
                <div className="h-2.5 w-4/5 rounded-full bg-paper-3" />
                <div className="h-2.5 w-2/3 rounded-full bg-paper-3" />
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="sr-only">
        Animated demo: Zenoryx cuts a TypeScript file into four chunks along its declarations, ranks them, and answers
        &ldquo;{QUESTION}&rdquo; with citations to the chunks verify, sign, SessionStore and the module scope.
      </p>
    </div>
  );
}
