import { Scissors, Check, X } from "lucide-react";
import { CodeText } from "./code";
import { cn } from "@/lib/format";

const LINES = [
  "export async function handleUpload(req, res) {",
  "  const file = req.files?.avatar;",
  '  if (!file) return res.status(400).json({ error: "missing" });',
  "",
  "  const ext = path.extname(file.name).toLowerCase();",
  "  if (!ALLOWED.has(ext)) {",
  '    return res.status(415).json({ error: "type" });',
  "  }",
  "",
  "  const key = `${req.user.id}/${Date.now()}${ext}`;",
  "  await storage.put(key, file.data);",
  "  return res.json({ url: cdnUrl(key) });",
  "}",
  "",
  "function cdnUrl(key) {",
  "  return `${process.env.CDN_ORIGIN}/${key}`;",
  "}",
  "",
  'const ALLOWED = new Set([".png", ".jpg", ".webp"]);',
];

// Naive splitter: fixed-size windows that ignore syntax.
const CUTS = [
  { after: 6, label: "cut @ 1,000 chars", note: "splits handleUpload mid-branch" },
  { after: 15, label: "cut @ 2,000 chars", note: "signature orphaned from body" },
];
// AST chunker: whole declarations.
const NODES = [
  { start: 1, end: 13, label: "function_declaration", symbol: "handleUpload" },
  { start: 15, end: 17, label: "function_declaration", symbol: "cdnUrl" },
  { start: 19, end: 19, label: "lexical_declaration", symbol: "ALLOWED" },
];

const LH = 20;

function Panel({ variant }) {
  const naive = variant === "naive";
  return (
    <figure className="panel overflow-hidden">
      <figcaption className="flex h-11 items-center justify-between border-b hairline px-4">
        <span className="flex items-center gap-2 text-[13px] font-medium">
          {naive ? <Scissors className="size-3.5 text-coral" /> : <span className="size-1.5 rounded-full bg-signal" />}
          {naive ? "Fixed-size splitter" : "Zenoryx AST chunker"}
        </span>
        <span className="font-mono text-[10px] text-fg-subtle">{naive ? "3 windows · 1,000 chars" : "3 nodes · tree-sitter"}</span>
      </figcaption>

      <div className="overflow-x-auto scroll-thin">
        <div className="relative min-w-[30rem] py-4 font-mono text-[11.5px]">
          {LINES.map((line, i) => (
            <div key={i} className="flex whitespace-pre" style={{ height: LH, lineHeight: `${LH}px` }}>
              <span className="w-10 shrink-0 select-none pr-3 text-right text-fg-faint">{i + 1}</span>
              <span>
                <CodeText line={line} />
              </span>
            </div>
          ))}

          {naive
            ? CUTS.map((c) => (
                <div key={c.after} className="pointer-events-none absolute inset-x-0" style={{ top: 16 + c.after * LH - 1 }}>
                  <div className="border-t border-dashed border-coral/80" />
                  <div className="absolute right-3 top-1 flex items-center gap-1.5 rounded border border-coral/30 bg-ink-950 px-1.5 py-0.5 font-mono text-[9.5px] text-coral">
                    <Scissors className="size-2.5" />
                    {c.label} <span className="hidden text-coral/70 sm:inline">· {c.note}</span>
                  </div>
                </div>
              ))
            : NODES.map((n) => (
                <div
                  key={n.symbol}
                  className="pointer-events-none absolute left-9 right-2 rounded-md border border-signal/45 bg-signal/[0.035]"
                  style={{ top: 16 + (n.start - 1) * LH - 2, height: (n.end - n.start + 1) * LH + 4 }}
                >
                  <span className="absolute -top-2 right-2 rounded border border-[var(--line-strong)] bg-ink-900 px-1.5 font-mono text-[9.5px] leading-[15px] text-signal">
                    {n.label} · {n.symbol}
                  </span>
                </div>
              ))}
        </div>
      </div>

      <div className={cn("flex items-start gap-2.5 border-t hairline px-4 py-3.5 text-[13px]", naive ? "text-fg-muted" : "text-fg")}>
        {naive ? <X className="mt-0.5 size-4 shrink-0 text-coral" /> : <Check className="mt-0.5 size-4 shrink-0 text-signal" />}
        <p>
          {naive
            ? "Retrieval returns the type check without the storage call — the model sees half a function and guesses the rest."
            : "Every chunk is a complete unit with its name, signature and exact line range, so citations link straight to the code."}
        </p>
      </div>
    </figure>
  );
}

export function ChunkingCompare() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel variant="naive" />
      <Panel variant="ast" />
    </div>
  );
}
