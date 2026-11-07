import { Boxes, DatabaseZap, Gauge, KeyRound, Quote, Search } from "lucide-react";
import { cn } from "@/lib/format";

const SPECS = [
  {
    icon: Search,
    tag: "retrieval",
    title: "Hybrid search, not just cosine",
    body: "pgvector similarity, re-ranked with a boost for exact identifiers — ask about useAuthStore and you get useAuthStore — plus per-file diversity so one big file can't hog the answer.",
    detail: "score = cos + id_boost − test_penalty",
    dot: "bg-blue",
    tape: "",
  },
  {
    icon: Quote,
    tag: "grounding",
    title: "Receipts for every claim",
    body: "Answers cite [n] sources. Each one resolves to a chunk with its symbol and line range, linked to GitHub at the exact commit that was indexed.",
    detail: "blob/<sha>/lib/index.js#L159-L190",
    dot: "bg-pink",
    tape: "tape-pink",
  },
  {
    icon: Gauge,
    tag: "resilience",
    title: "A quota-aware model pool",
    body: "Seven free-tier models (Gemini Flash-Lite + Groq gpt-oss/qwen) behind one gateway, each with its own token bucket. Calls wait for budget instead of eating 429s; streams only fail over before the first token.",
    detail: "rpm + tpm buckets · per-day quota parking",
    dot: "bg-orange",
    tape: "tape-blue",
  },
  {
    icon: DatabaseZap,
    tag: "jobs",
    title: "Postgres is the queue",
    body: "No Redis to babysit. Jobs are claimed atomically, retried with backoff, handed back on shutdown and recovered on boot — a redeploy mid-ingestion loses nothing.",
    detail: "UPDATE … WHERE status = 'PENDING'",
    dot: "bg-green",
    tape: "",
  },
  {
    icon: KeyRound,
    tag: "security",
    title: "Boring, correct sessions",
    body: "Server-side sessions in HttpOnly cookies signed with HMAC-SHA256, checked in constant time and revocable instantly — served first-party through the /api proxy.",
    detail: "bcrypt(12) · timingSafeEqual",
    dot: "bg-yellow",
    tape: "tape-pink",
  },
  {
    icon: Boxes,
    tag: "cost",
    title: "Runs on free tiers. Only.",
    body: "File contents come from GitHub's raw CDN (no API quota), embeddings are batched and paced, and health checks never wake the database.",
    detail: "Neon · Gemini · Groq · GitHub = $0",
    dot: "bg-pink",
    tape: "tape-blue",
  },
];

const TILTS = [-1.4, 0.9, -0.5, 1.2, -1, 0.6];

export function SpecGrid() {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {SPECS.map((s, i) => (
        <li
          key={s.title}
          className={cn("tape transition-transform duration-300 hover:!rotate-0 hover:-translate-y-1", s.tape)}
          style={{ transform: `rotate(${TILTS[i]}deg)`, "--tape-r": `${i % 2 ? 4 : -3}deg` }}
        >
          <article className="ruled flex h-full flex-col overflow-hidden rounded-xl border-[1.5px] border-ink bg-paper-2 shadow-[3px_3px_0_0_var(--color-ink)]">
            {/* index-card header rule */}
            <div className="flex items-center gap-2.5 border-b-2 border-pink/70 px-5 pb-3 pt-5">
              <span className={cn("grid size-8 place-items-center rounded-full border-[1.5px] border-ink text-ink", s.dot)}>
                <s.icon className="size-4" />
              </span>
              <span className="eyebrow">{s.tag}</span>
            </div>
            <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
              <h3 className="font-display text-xl font-extrabold leading-tight tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-[2rem] text-ink-2">{s.body}</p>
              <p className="mt-auto pt-3 font-mono text-[11px] text-blue">{s.detail}</p>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
