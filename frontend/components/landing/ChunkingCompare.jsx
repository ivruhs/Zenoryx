import { Check, Scissors, X } from "lucide-react";
import { cn } from "@/lib/format";
import { CodeText } from "./code";

const LINES = [
  "export async function upload(req, res) {",
  "  const file = req.files?.avatar;",
  "  if (!file) return res.status(400).end();",
  "",
  "  const ext = path.extname(file.name);",
  "  if (!ALLOWED.has(ext)) {",
  "    return res.status(415).end();",
  "  }",
  "",
  "  const key = `${req.user.id}/${ext}`;",
  "  await storage.put(key, file.data);",
  "  return res.json({ url: cdn(key) });",
  "}",
  "",
  "function cdn(key) {",
  "  return `${process.env.CDN}/${key}`;",
  "}",
  "",
  'const ALLOWED = new Set([".png", ".jpg"]);',
];

// Naive splitter: fixed windows that ignore syntax.
const TEARS = [
  { after: 6, note: "oops — the if lost its body", r: -4 },
  { after: 15, note: "signature, meet nobody", r: 3 },
];
// AST chunker: whole declarations.
const NODES = [
  { start: 1, end: 13, label: "function_declaration", symbol: "upload", color: "var(--color-pink-soft)" },
  { start: 15, end: 17, label: "function_declaration", symbol: "cdn", color: "var(--color-blue-soft)" },
  { start: 19, end: 19, label: "lexical_declaration", symbol: "ALLOWED", color: "var(--color-yellow-soft)" },
];
const SEAMS = [14, 18];

function Code() {
  return (
    <pre className="relative font-mono text-[10.5px] leading-[var(--lh)] sm:text-[12px]">
      {LINES.map((line, i) => (
        <div key={i} className="flex">
          <span className="absolute -ml-7 w-5 select-none text-right text-blue/40">{i + 1}</span>
          <span className="whitespace-pre">
            <CodeText line={line} />
          </span>
        </div>
      ))}
    </pre>
  );
}

function Tear({ row }) {
  return (
    <svg
      viewBox="0 0 400 12"
      preserveAspectRatio="none"
      className="absolute left-0 right-0 h-3 w-full"
      style={{ top: `calc(var(--pad) + ${row} * var(--lh) - 6px)` }}
      aria-hidden="true"
    >
      <polyline
        points={Array.from({ length: 51 }, (_, i) => `${i * 8},${i % 2 ? 2 + ((i * 7) % 4) : 9 - ((i * 5) % 3)}`).join(" ")}
        fill="none"
        stroke="var(--color-pink-deep)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Sheet({ title, verdict, good, children, note }) {
  return (
    <figure className="flex min-w-0 flex-col">
      <figcaption className="mb-3 flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-full border-[1.5px] border-ink",
            good ? "bg-green text-paper-2" : "bg-pink text-ink",
          )}
        >
          {good ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} />}
        </span>
        <span className="font-display text-lg font-bold tracking-tight">{title}</span>
      </figcaption>
      <div className={cn("paper relative overflow-hidden [--lh:17px] [--pad:16px] sm:[--lh:20px]", good ? "offset-blue" : "")}>
        <div className="relative py-[var(--pad)] pl-9 pr-3">{children}</div>
      </div>
      <p className="mt-4 flex items-start gap-2 text-[15px] leading-relaxed text-ink-2">{verdict}</p>
      {note}
    </figure>
  );
}

export function ChunkingCompare() {
  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
      <Sheet
        title="Hacked every 400 characters"
        verdict="Retrieval hands the model half an if-statement and a function signature with no body. It fills the gaps by guessing."
      >
        {/* window shading */}
        {[
          [0, 6],
          [6, 15],
          [15, LINES.length],
        ].map(([a, b], i) => (
          <div
            key={a}
            aria-hidden="true"
            className="absolute left-0 right-0"
            style={{
              top: `calc(var(--pad) + ${a} * var(--lh))`,
              height: `calc(${b - a} * var(--lh))`,
              background: i % 2 ? "var(--color-paper)" : "transparent",
            }}
          />
        ))}
        <Code />
        {TEARS.map((t) => (
          <div key={t.after}>
            <Tear row={t.after} />
            <span
              className="hand absolute right-2 z-10 rounded-md bg-paper-2/90 px-1.5 text-[17px] text-pink-deep sm:text-xl"
              style={{ top: `calc(var(--pad) + ${t.after} * var(--lh) + 4px)`, transform: `rotate(${t.r}deg)` }}
            >
              {t.note}
            </span>
          </div>
        ))}
      </Sheet>

      <Sheet
        good
        title="Cut along the seams"
        verdict="Every chunk is a whole declaration with its name, signature and line range — so answers can cite exactly where they came from."
      >
        {NODES.map((n) => (
          <div
            key={n.start}
            aria-hidden="true"
            className="absolute left-7 right-2 rounded-lg border-[1.5px] border-ink"
            style={{
              top: `calc(var(--pad) + ${n.start - 1} * var(--lh) - 3px)`,
              height: `calc(${n.end - n.start + 1} * var(--lh) + 6px)`,
              background: n.color,
            }}
          >
            <span className="absolute -top-2.5 right-2 rounded-full border border-ink bg-paper-2 px-1.5 font-mono text-[9px] leading-4 text-ink-2 sm:text-[10px]">
              {n.label} · {n.symbol}
            </span>
          </div>
        ))}
        {SEAMS.map((row) => (
          <div
            key={row}
            aria-hidden="true"
            className="absolute left-0 right-0 flex items-center gap-1"
            style={{ top: `calc(var(--pad) + ${row - 0.5} * var(--lh) - 8px)` }}
          >
            <Scissors className="size-4 shrink-0 -rotate-90 text-ink" />
            <span className="h-0 flex-1 border-t-2 border-dashed border-ink/50" />
          </div>
        ))}
        <Code />
      </Sheet>
    </div>
  );
}
