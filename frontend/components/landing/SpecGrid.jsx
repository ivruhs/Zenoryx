import { Binary, CircuitBoard, DatabaseZap, Link2, ShieldCheck, Wallet } from "lucide-react";

const SPECS = [
  {
    icon: Binary,
    label: "Retrieval",
    title: "Hybrid search, not just cosine",
    body: "pgvector similarity is re-ranked with exact identifier matches, so asking about useAuthStore finds useAuthStore — with per-file diversity in the top-k.",
    detail: "score = cos + id_boost − test_penalty",
  },
  {
    icon: Link2,
    label: "Grounding",
    title: "Citations to the exact line",
    body: "Every claim carries a [n] marker that resolves to a chunk with its file, symbol and line range, pinned to the indexed commit on GitHub.",
    detail: "blob/5317ebe/lib/index.js#L159-L190",
  },
  {
    icon: CircuitBoard,
    label: "Resilience",
    title: "A quota-aware model pool",
    body: "Seven free-tier models sit behind one gateway, each with its own token bucket. Calls wait for budget instead of hitting 429s, exhausted models are parked, and streams only fail over before the first token.",
    detail: "rpm + tpm buckets · per-day quota parking",
  },
  {
    icon: DatabaseZap,
    label: "Jobs",
    title: "A durable queue in Postgres",
    body: "Atomic claims, exponential retries and recovery on boot. A redeploy mid-ingestion resumes instead of leaving a repository stuck.",
    detail: "UPDATE … WHERE status = 'PENDING'",
  },
  {
    icon: ShieldCheck,
    label: "Security",
    title: "Server-side sessions",
    body: "HttpOnly cookies signed with HMAC-SHA256 and checked in constant time, revocable instantly, served first-party through the /api proxy.",
    detail: "bcrypt(12) · timingSafeEqual",
  },
  {
    icon: Wallet,
    label: "Cost",
    title: "Runs entirely on free tiers",
    body: "Batched embeddings, raw-CDN downloads that skip API quota, and health checks that never wake the database. Zero infrastructure spend.",
    detail: "Neon · Gemini · Groq · GitHub",
  },
];

export function SpecGrid() {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border hairline bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
      {SPECS.map(({ icon: Icon, label, title, body, detail }) => (
        <article key={title} className="flex flex-col bg-ink-900 p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border hairline-strong bg-ink-850">
              <Icon className="size-4 text-fg-muted" />
            </span>
            <span className="eyebrow">{label}</span>
          </div>
          <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">{body}</p>
          <code className="mt-5 block truncate rounded-md border hairline bg-ink-950 px-2.5 py-1.5 font-mono text-[11px] text-fg-subtle">
            {detail}
          </code>
        </article>
      ))}
    </div>
  );
}
