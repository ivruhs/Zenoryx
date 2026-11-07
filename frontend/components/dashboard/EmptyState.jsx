import Link from "next/link";
import { ArrowUpRight, Plus, Scissors } from "lucide-react";
import { STAGES } from "@/lib/pipeline";

const SUGGESTIONS = [
  { repo: "expressjs/cors", blurb: "Express CORS middleware", lang: "JavaScript", tape: "", r: "-0.7deg", tr: "-4deg" },
  { repo: "sindresorhus/ky", blurb: "Tiny fetch-based HTTP client", lang: "TypeScript", tape: "tape-pink", r: "0.6deg", tr: "3deg" },
  { repo: "pallets/itsdangerous", blurb: "Cryptographic signing helpers", lang: "Python", tape: "tape-blue", r: "-0.4deg", tr: "-2deg" },
  { repo: "tj/commander.js", blurb: "Node.js CLI framework", lang: "JavaScript", tape: "", r: "0.8deg", tr: "4deg" },
];

const STAGE_INKS = ["var(--color-yellow)", "var(--color-pink)", "var(--color-blue-soft)", "var(--color-green-soft)", "var(--color-orange-soft)"];

/** Hand-drawn curved arrow for margin notes. */
function Squiggle({ className }) {
  return (
    <svg viewBox="0 0 90 46" fill="none" className={className} aria-hidden="true">
      <path d="M3 8c18-6 40-4 52 10s6 22-6 18-6-18 12-20 22 6 26 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M79 21l8 11-13-1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyState() {
  return (
    <section className="relative grid gap-12 pb-6 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      {/* Halftone splash behind the headline */}
      <div className="halftone halftone-fade pointer-events-none absolute -left-10 -top-16 size-72 opacity-50" style={{ "--ht": "var(--color-yellow)" }} aria-hidden="true" />

      <div className="relative">
        <span className="sticker bg-yellow" style={{ "--r": "-4deg" }}>
          <Scissors className="size-3.5" /> First issue
        </span>
        <h2
          className="mt-5 text-[2.5rem] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-6xl"
          style={{ fontVariationSettings: '"wdth" 84' }}
        >
          Point Zenoryx at a repository.
          <br />
          <span className="marker marker-pink">Ask it anything.</span>
        </h2>
        <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-2">
          Paste any public GitHub URL. We rank its files by architectural relevance, cut them into whole functions and classes with
          Tree-sitter, and embed every piece, so each answer cites the exact lines it came from.
        </p>

        <ol className="mt-8 flex flex-wrap gap-2" aria-label="Pipeline stages">
          {STAGES.map((s, i) => (
            <li
              key={s.id}
              className="sticker text-xs"
              style={{ background: STAGE_INKS[i], "--r": `${i % 2 ? 2 : -2}deg` }}
            >
              <span className="font-mono text-[10px] text-ink-2">0{i + 1}</span> {s.label}
            </li>
          ))}
        </ol>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/projects/new" className="btn btn-primary btn-lg">
            <Plus className="size-4" strokeWidth={2.5} /> Index a repository
          </Link>
          <span className="hand flex items-center gap-1 text-xl text-ink-3">
            or grab a clipping
            <Squiggle className="hidden h-8 w-16 text-pink-deep lg:block" />
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="eyebrow mb-6">Try one of these</div>
        <ul className="grid gap-6">
          {SUGGESTIONS.map((s) => (
            <li key={s.repo}>
              <Link
                href={`/projects/new?repo=${encodeURIComponent(s.repo)}`}
                className={`paper tape group flex items-center gap-4 px-5 py-4 transition-[transform,box-shadow] duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:shadow-[5px_5px_0_0_var(--color-ink)] ${s.tape}`}
                style={{ transform: `rotate(${s.r})`, "--tape-r": s.tr }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[14px] text-ink">
                    <span className="text-ink-3">{s.repo.split("/")[0]}/</span>
                    <span className="font-bold">{s.repo.split("/")[1]}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-ink-3">
                    {s.blurb} · {s.lang}
                  </div>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-paper transition-[background-color,transform] duration-300 group-hover:rotate-45 group-hover:bg-pink">
                  <ArrowUpRight className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="hand mt-6 text-lg text-ink-3">small repos come off the press in about 30 seconds</p>
      </div>
    </section>
  );
}
