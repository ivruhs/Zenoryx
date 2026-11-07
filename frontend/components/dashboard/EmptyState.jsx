import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { STAGES } from "@/lib/pipeline";

const SUGGESTIONS = [
  { repo: "expressjs/cors", blurb: "Express CORS middleware", lang: "JavaScript" },
  { repo: "sindresorhus/ky", blurb: "Tiny fetch-based HTTP client", lang: "TypeScript" },
  { repo: "pallets/itsdangerous", blurb: "Cryptographic signing helpers", lang: "Python" },
  { repo: "tj/commander.js", blurb: "Node.js CLI framework", lang: "JavaScript" },
];

export function EmptyState() {
  return (
    <section className="relative overflow-hidden rounded-2xl border hairline bg-ink-900">
      <div className="pointer-events-none absolute inset-0 bg-dots fade-mask-b opacity-60" aria-hidden="true" />
      <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div>
          <span className="eyebrow">First run</span>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-4xl">
            Point Zenoryx at a repository.
            <br />
            <em className="font-serif font-normal italic text-fg-muted">Ask it anything.</em>
          </h2>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-fg-muted">
            Paste any public GitHub URL. We rank its files by architectural relevance, parse them into whole functions and classes
            with Tree-sitter, and embed every chunk, so answers cite the exact lines they came from.
          </p>

          <ol className="mt-7 grid grid-cols-5 gap-1.5" aria-label="Pipeline stages">
            {STAGES.map((s, i) => (
              <li key={s.id} className="min-w-0">
                <div className="h-0.5 rounded-full bg-ink-700" />
                <div className="mt-2 font-mono text-[10px] text-fg-faint">0{i + 1}</div>
                <div className="truncate text-xs text-fg-muted">{s.label}</div>
              </li>
            ))}
          </ol>

          <Link href="/projects/new" className="btn btn-primary mt-8">
            <Plus className="size-4" /> Index a repository
          </Link>
        </div>

        <div>
          <div className="eyebrow mb-3">Or try one of these</div>
          <ul className="grid gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s.repo}>
                <Link
                  href={`/projects/new?repo=${encodeURIComponent(s.repo)}`}
                  className="group flex items-center gap-4 rounded-xl border hairline bg-ink-950/60 px-4 py-3.5 transition-colors hover:border-signal/30 hover:bg-ink-850"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[13px] text-fg">
                      <span className="text-fg-subtle">{s.repo.split("/")[0]}/</span>
                      {s.repo.split("/")[1]}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-fg-subtle">
                      {s.blurb} · {s.lang}
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-fg-faint transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-signal" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[11px] text-fg-faint">Small repositories index in about 30 seconds.</p>
        </div>
      </div>
    </section>
  );
}
