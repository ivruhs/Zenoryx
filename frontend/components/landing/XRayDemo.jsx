"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Check, FileCode2 } from "lucide-react";
import { CodeText } from "./code";
import { cn } from "@/lib/format";

/* ----------------------------------------------------------------------------
 * The signature hero visual: a real-looking file is scanned, split into AST
 * chunks, embedded, retrieved, and cited in a streamed answer. Everything is
 * derived from a single clock `t`, so the loop is deterministic and pausable.
 * -------------------------------------------------------------------------- */

const FILE = "src/auth/session.ts";
const LINES = [
  'import { createHmac, timingSafeEqual } from "node:crypto";',
  'import { db } from "./db";',
  "",
  "const TTL_MS = 7 * 24 * 60 * 60 * 1000;",
  "const hmac = (key: string, value: string) =>",
  '  createHmac("sha256", key).update(value).digest();',
  "",
  "export function signToken(raw: string, key: string) {",
  '  return `${raw}.${hmac(key, raw).toString("hex")}`;',
  "}",
  "",
  "export async function verifySession(cookie: string, key: string) {",
  '  const [raw, sig = ""] = cookie.split(".");',
  "  const expected = hmac(key, raw);",
  '  const actual = Buffer.from(sig, "hex");',
  "  if (actual.length !== expected.length) return null;",
  "  if (!timingSafeEqual(actual, expected)) return null;",
  "",
  "  const session = await db.sessions.get(raw);",
  "  if (!session || session.expiresAt < Date.now()) return null;",
  "  return session.user;",
  "}",
  "",
  "export class SessionStore {",
  "  async create(userId: string) {",
  "    const token = crypto.randomUUID();",
  "    const expiresAt = Date.now() + TTL_MS;",
  "    await db.sessions.put({ token, userId, expiresAt });",
  "    return token;",
  "  }",
  "}",
];

const CHUNKS = [
  { start: 1, end: 6, type: "module", symbol: "hmac", score: 0.58 },
  { start: 8, end: 10, type: "function_declaration", symbol: "signToken", score: 0.81 },
  { start: 12, end: 22, type: "function_declaration", symbol: "verifySession", score: 0.89 },
  { start: 24, end: 31, type: "class_declaration", symbol: "SessionStore", score: 0.62 },
];
const CITE_TO_CHUNK = { 1: 1, 2: 2 };

const QUESTION = "How are session cookies verified?";
const ANSWER =
  "`verifySession` splits the cookie into token and signature, recomputes the HMAC-SHA256 and compares it in constant time with `timingSafeEqual` [2]. Tokens are minted by `signToken` with the same key [1], and a valid signature still needs a live, unexpired row in `db.sessions` [2].";

// Timeline (ms)
const D = { idle: 500, scan: 2700, embed: 1500, type: 1300, gap: 450, stream: 3400, hold: 4200 };
const M = (() => {
  const scan0 = D.idle;
  const embed0 = scan0 + D.scan;
  const type0 = embed0 + D.embed;
  const stream0 = type0 + D.type + D.gap;
  const hold0 = stream0 + D.stream;
  return { scan0, embed0, type0, stream0, hold0, total: hold0 + D.hold };
})();
const FINAL_T = M.hold0 + 400;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Parses the answer once into text / inline-code / citation segments. */
function segment(text) {
  const segs = [];
  const re = /(`[^`]+`)|\[(\d+)\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1]) segs.push({ kind: "code", text: m[1].slice(1, -1), raw: m[1] });
    else segs.push({ kind: "cite", n: Number(m[2]), raw: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ kind: "text", text: text.slice(last) });
  return segs;
}
const SEGMENTS = segment(ANSWER);

// Deterministic pseudo-random intensities for the vector matrix.
const CELLS = 30;
const intensity = (row, col) => {
  const x = Math.sin(row * 91.7 + col * 12.9898) * 43758.5453;
  return 0.25 + (x - Math.floor(x)) * 0.75;
};

function useClock() {
  const [t, setT] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setT(FINAL_T);
      return;
    }
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.1 });
    if (ref.current) io.observe(ref.current);
    let raf;
    let last = performance.now();
    let acc = 0;
    let lastPaint = 0;
    const loop = (now) => {
      const dt = Math.min(now - last, 100);
      last = now;
      if (visible && !document.hidden) {
        acc = (acc + dt) % M.total;
        if (now - lastPaint > 30) {
          lastPaint = now;
          setT(acc);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);
  return [t, ref];
}

function Answer({ chars, active, onHover }) {
  let used = 0;
  const out = [];
  for (const [i, s] of SEGMENTS.entries()) {
    const len = s.kind === "text" ? s.text.length : s.raw.length;
    if (used >= chars) break;
    const visible = chars - used;
    used += len;
    if (s.kind === "text") out.push(<Fragment key={i}>{s.text.slice(0, visible)}</Fragment>);
    else if (s.kind === "code")
      out.push(
        <code key={i} className="rounded border hairline bg-ink-800 px-1 py-px font-mono text-[0.85em] text-fg">
          {s.text.slice(0, Math.max(0, visible - 1))}
        </code>,
      );
    else if (visible >= len)
      out.push(
        <button
          key={i}
          type="button"
          onMouseEnter={() => onHover(s.n)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(s.n)}
          onBlur={() => onHover(null)}
          aria-label={`Source ${s.n}`}
          className={cn(
            "mx-0.5 inline-flex h-[1.3em] min-w-[1.3em] -translate-y-px items-center justify-center rounded-[4px] border px-1 align-middle font-mono text-[0.7em] transition-colors",
            active === s.n ? "border-signal bg-signal text-signal-ink" : "border-[var(--line-strong)] bg-ink-800 text-fg-muted",
          )}
        >
          {s.n}
        </button>,
      );
  }
  return out;
}

const RAIL = [
  { id: "parse", label: "Parse", detail: "tree-sitter · 4 chunks" },
  { id: "embed", label: "Embed", detail: "gemini · 3072-d" },
  { id: "retrieve", label: "Retrieve", detail: "cosine + identifiers" },
  { id: "answer", label: "Answer", detail: "SSE · cited" },
];

export function XRayDemo() {
  const [t, ref] = useClock();
  const [hoverCite, setHoverCite] = useState(null);

  const scanP = clamp01((t - M.scan0) / D.scan);
  const scanLine = scanP * LINES.length;
  const scanning = t >= M.scan0 && t < M.embed0;
  const embedP = clamp01((t - M.embed0) / D.embed);
  const typed = Math.floor(clamp01((t - M.type0) / D.type) * QUESTION.length);
  const streamed = Math.floor(clamp01((t - M.stream0) / D.stream) * ANSWER.length);
  const retrieving = t >= M.type0 + D.type;
  const holding = t >= M.hold0;

  const autoCite = holding ? ((t - M.hold0) % 2400 < 1200 ? 2 : 1) : null;
  const activeCite = hoverCite ?? autoCite;
  const activeChunk = activeCite ? CITE_TO_CHUNK[activeCite] : null;

  const phase = t < M.embed0 ? 0 : t < M.type0 ? 1 : t < M.stream0 ? 2 : 3;
  const phaseDone = (i) => (i < phase || (i === 3 && holding));

  const ranked = useMemo(() => [...CHUNKS.keys()].sort((a, b) => CHUNKS[b].score - CHUNKS[a].score), []);
  const topK = new Set(ranked.slice(0, 2));

  return (
    <div ref={ref} className="panel-raised relative overflow-hidden" aria-label="Animated demo: Zenoryx parsing, embedding and answering a question about a file">
      {/* Title bar */}
      <div className="flex h-11 items-center gap-3 border-b hairline px-4">
        <div className="flex items-center gap-2 font-mono text-xs text-fg-muted">
          <FileCode2 className="size-3.5 text-fg-subtle" />
          {FILE}
        </div>
        <span className="chip hidden h-5 sm:inline-flex">typescript</span>
        <div className="flex-1" />
        <span className="eyebrow hidden sm:block">live pipeline</span>
        <span className={cn("size-1.5 rounded-full", holding ? "bg-signal" : "animate-pulse-dot bg-amber")} />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ---------------- Code + AST overlay ---------------- */}
        <div className="relative overflow-hidden border-b hairline py-4 lg:border-b-0 lg:border-r [--lh:17px] sm:[--lh:19px]">
          <div className="relative font-mono text-[10.5px] sm:text-[12px]">
            {LINES.map((line, i) => (
              <div key={i} className="flex whitespace-pre" style={{ height: "var(--lh)", lineHeight: "var(--lh)" }}>
                <span className="w-9 shrink-0 select-none pr-3 text-right text-fg-faint sm:w-11">{i + 1}</span>
                <span className="transition-opacity duration-500" style={{ opacity: scanLine > i || t >= M.embed0 ? 1 : 0.38 }}>
                  <CodeText line={line} />
                </span>
              </div>
            ))}

            {/* Chunk boundaries */}
            {CHUNKS.map((c, idx) => {
              const shown = scanLine >= c.end || t >= M.embed0;
              const isActive = activeChunk === idx;
              const dimmed = activeChunk != null && !isActive;
              return (
                <div
                  key={c.symbol}
                  className={cn(
                    "pointer-events-none absolute left-8 right-2 rounded-md border transition-all duration-500 sm:left-10",
                    shown ? "opacity-100" : "scale-[0.985] opacity-0",
                    isActive
                      ? "border-signal bg-signal/[0.09] shadow-[0_0_0_4px_rgba(200,245,66,0.08)]"
                      : c.type === "module"
                        ? "border-dashed border-white/15 bg-white/[0.015]"
                        : "border-signal/40 bg-signal/[0.03]",
                    dimmed && "opacity-40",
                  )}
                  style={{
                    top: `calc(var(--lh) * ${c.start - 1} - 2px)`,
                    height: `calc(var(--lh) * ${c.end - c.start + 1} + 4px)`,
                  }}
                >
                  <span
                    className={cn(
                      "absolute -top-2 right-2 rounded border px-1.5 font-mono text-[9.5px] leading-[15px]",
                      isActive ? "border-signal bg-signal text-signal-ink" : "border-[var(--line-strong)] bg-ink-900",
                      !isActive && (c.type === "module" ? "text-fg-subtle" : "text-signal"),
                    )}
                  >
                    <span className="hidden sm:inline">{c.type} · </span>L{c.start}–{c.end}
                  </span>
                </div>
              );
            })}

            {/* Scan line */}
            {scanning && (
              <div className="pointer-events-none absolute inset-x-0" style={{ top: `calc(var(--lh) * ${scanLine})` }}>
                <div className="absolute inset-x-0 -top-14 h-14 bg-gradient-to-b from-transparent to-signal/[0.07]" />
                <div className="h-px bg-signal shadow-[0_0_12px_2px_rgba(200,245,66,0.55)]" />
              </div>
            )}
          </div>
        </div>

        {/* ---------------- Pipeline / vectors / chat ---------------- */}
        <div className="flex min-w-0 flex-col">
          <ol className="grid grid-cols-4 border-b hairline">
            {RAIL.map((r, i) => {
              const done = phaseDone(i);
              const active = i === phase && !done;
              return (
                <li key={r.id} className={cn("border-r hairline px-3 py-3 last:border-r-0", active && "bg-white/[0.02]")}>
                  <div className="flex items-center gap-1.5">
                    {done ? (
                      <Check className="size-3 text-signal" />
                    ) : (
                      <span className={cn("size-1.5 rounded-full", active ? "animate-pulse-dot bg-amber" : "bg-fg-faint")} />
                    )}
                    <span className={cn("text-[12px] font-medium", done || active ? "text-fg" : "text-fg-subtle")}>{r.label}</span>
                  </div>
                  <div className="mt-1 hidden truncate font-mono text-[10px] text-fg-subtle xl:block">{r.detail}</div>
                </li>
              );
            })}
          </ol>

          {/* Vector matrix */}
          <div className="border-b hairline px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">Embeddings</span>
              <span className="font-mono text-[10px] text-fg-subtle">{retrieving ? "cosine similarity" : "3072 dims / chunk"}</span>
            </div>
            <div className="space-y-1.5">
              {CHUNKS.map((c, row) => {
                const rowP = clamp01(embedP * CHUNKS.length - row);
                const hit = retrieving && topK.has(row);
                const isActive = activeChunk === row;
                return (
                  <div key={c.symbol} className="flex items-center gap-2.5">
                    <span className={cn("w-[5.5rem] truncate font-mono text-[10px]", hit ? "text-fg" : "text-fg-subtle")}>{c.symbol}</span>
                    <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: `repeat(${CELLS}, minmax(0, 1fr))` }}>
                      {Array.from({ length: CELLS }, (_, col) => {
                        const lit = rowP * CELLS > col;
                        return (
                          <span
                            key={col}
                            className="h-2.5 rounded-[2px] transition-colors duration-300"
                            style={{
                              background: lit
                                ? `rgba(${isActive ? "200,245,66" : "94,227,239"}, ${(retrieving && !hit ? 0.35 : 1) * intensity(row, col) * 0.85})`
                                : "var(--color-ink-750)",
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className={cn("w-9 text-right font-mono text-[10px] tabular-nums transition-opacity", retrieving ? "opacity-100" : "opacity-0", hit ? "text-signal" : "text-fg-faint")}>
                      {c.score.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat */}
          <div className="flex min-h-[220px] flex-1 flex-col gap-3 px-4 py-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 font-mono text-xs text-signal">›</span>
              <p className={cn("text-[13px] text-fg", typed < QUESTION.length && t >= M.type0 && "caret")}>
                {QUESTION.slice(0, typed)}
                {t < M.type0 && <span className="text-fg-faint">Ask anything about the code…</span>}
              </p>
            </div>
            <div className="min-h-0 flex-1 text-[13px] leading-[1.65] text-fg-muted">
              {streamed > 0 && (
                <p className={cn(streamed < ANSWER.length && "caret")}>
                  <Answer chars={streamed} active={activeCite} onHover={setHoverCite} />
                </p>
              )}
              {retrieving && streamed === 0 && <p className="font-mono text-[11px] text-fg-subtle">retrieving top-k chunks…</p>}
            </div>
            <div className={cn("flex flex-wrap gap-1.5 transition-opacity duration-500", streamed >= ANSWER.length ? "opacity-100" : "opacity-0")}>
              {[1, 2].map((n) => {
                const c = CHUNKS[CITE_TO_CHUNK[n]];
                return (
                  <span
                    key={n}
                    onMouseEnter={() => setHoverCite(n)}
                    onMouseLeave={() => setHoverCite(null)}
                    className={cn("chip h-6 transition-colors", activeCite === n && "border-signal/60 text-fg")}
                  >
                    <span className={activeCite === n ? "text-signal" : "text-fg-subtle"}>[{n}]</span>
                    session.ts:{c.start}–{c.end}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
