"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { TornEdge } from "@/components/landing/Doodles";

/* A thermal receipt that prints a replayed Zenoryx session, line by line. */
const LINES = [
  { kind: "head", text: "ZENORYX · CUT & PASTE CO." },
  { kind: "dim", text: "public repos · free since day one" },
  { kind: "rule" },
  { kind: "cmd", text: "$ zenoryx cut github.com/expressjs/cors" },
  { kind: "row", a: "FETCH", b: "master · 7 files ranked" },
  { kind: "row", a: "CUT", b: "28 chunks · tree-sitter" },
  { kind: "row", a: "ANNOTATE", b: "7 file notes" },
  { kind: "row", a: "EMBED", b: "28 × 3072-d → pgvector" },
  { kind: "row", a: "HISTORY", b: "6 commits read" },
  { kind: "rule" },
  { kind: "total", a: "READY IN", b: "≈ 22 s" },
  { kind: "gap" },
  { kind: "cmd", text: '$ zenoryx ask "where is preflight handled?"' },
  {
    kind: "answer",
    text: "Inside cors() itself: for OPTIONS requests it sets the origin, method and header rules, then ends with a 204 — unless preflightContinue hands it on.",
    cites: [1, 2],
  },
  { kind: "src", text: "[1] lib/index.js · L159–190" },
  { kind: "src", text: "[2] README.md · L185–228" },
  { kind: "rule" },
  { kind: "thanks", text: "THANK YOU · ASK AGAIN SOON" },
  { kind: "barcode" },
];

function Line({ line }) {
  switch (line.kind) {
    case "head":
      return <p className="text-center font-display text-[15px] font-extrabold tracking-wide">{line.text}</p>;
    case "dim":
      return <p className="text-center text-[11px] text-ink-3">{line.text}</p>;
    case "rule":
      return <p className="my-1.5 overflow-hidden whitespace-nowrap text-ink-4">{"- ".repeat(40)}</p>;
    case "gap":
      return <div className="h-3" />;
    case "cmd":
      return <p className="font-bold text-blue">{line.text}</p>;
    case "row":
      return (
        <p className="flex justify-between gap-3">
          <span className="font-bold">✓ {line.a}</span>
          <span className="truncate text-right text-ink-2">{line.b}</span>
        </p>
      );
    case "total":
      return (
        <p className="flex justify-between text-[14px] font-bold">
          <span>{line.a}</span>
          <span>{line.b}</span>
        </p>
      );
    case "answer":
      return (
        <p className="mt-1 leading-relaxed text-ink">
          {line.text}{" "}
          {line.cites.map((n) => (
            <span
              key={n}
              className="mx-0.5 inline-grid size-[1.4em] place-items-center rounded-full border-[1.5px] border-ink bg-pink align-middle text-[10px] font-bold"
            >
              {n}
            </span>
          ))}
        </p>
      );
    case "src":
      return <p className="text-[11px] text-ink-3">{line.text}</p>;
    case "thanks":
      return <p className="mt-1 text-center font-bold tracking-widest">{line.text}</p>;
    case "barcode":
      return (
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-10 w-4/5"
          style={{
            background:
              "repeating-linear-gradient(90deg, var(--color-ink) 0 2px, transparent 2px 4px, var(--color-ink) 4px 5px, transparent 5px 8px, var(--color-ink) 8px 11px, transparent 11px 12px)",
          }}
        />
      );
    default:
      return null;
  }
}

export function ReceiptPanel({ className }) {
  const [count, setCount] = useState(0);
  const [reduced, setReduced] = useState(false);
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      setCount(LINES.length);
      return;
    }
    if (!visible) return;
    const done = count >= LINES.length;
    const t = setTimeout(
      () => setCount((c) => (c >= LINES.length ? 0 : c + 1)),
      done ? 5200 : LINES[count]?.kind === "answer" ? 900 : 340,
    );
    return () => clearTimeout(t);
  }, [count, reduced, visible]);

  const printed = LINES.slice(0, count);
  const finished = count >= LINES.length;

  return (
    <div ref={ref} className={cn("relative mx-auto w-full max-w-[400px]", className)}>
      {/* the printer slot */}
      <div className="relative z-10 mx-auto h-4 w-[94%] rounded-full border-[1.5px] border-ink bg-ink shadow-[0_3px_0_0_var(--color-pink)]" />
      <div className="relative -mt-2 overflow-hidden px-[3%]">
        <div
          className="tape relative origin-top drop-shadow-[0_10px_14px_rgba(31,28,23,0.18)] transition-transform"
          style={{ "--tape-r": "-5deg", transform: "rotate(-1.2deg)" }}
        >
          <div className="bg-paper-2 px-5 pb-4 pt-6 font-mono text-[12px] leading-[1.55] text-ink" aria-live="off">
            {printed.map((line, i) => (
              <div key={i} className="animate-fade-in">
                <Line line={line} />
              </div>
            ))}
            {!finished && <span className="caret" />}
          </div>
          <TornEdge />
          {finished && (
            <span
              className="stamp absolute bottom-24 right-6 animate-stamp text-sm"
              style={{ "--stamp": "var(--color-pink-deep)", "--r": "-14deg" }}
              aria-hidden="true"
            >
              paid $0.00
            </span>
          )}
        </div>
      </div>
      <p className="sr-only">
        A receipt showing expressjs/cors being fetched, cut into 28 chunks, annotated, embedded and answered, with citations to
        lib/index.js and README.md.
      </p>
    </div>
  );
}
