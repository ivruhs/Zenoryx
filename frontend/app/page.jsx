import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroForm, CtaButtons } from "@/components/landing/HeroForm";
import { XRayDemo } from "@/components/landing/XRayDemo";
import { ChunkingCompare } from "@/components/landing/ChunkingCompare";
import { PipelineTrack } from "@/components/landing/PipelineTrack";
import { Architecture } from "@/components/landing/Architecture";
import { SpecGrid } from "@/components/landing/SpecGrid";
import { Logo } from "@/components/ui/Logo";

function SectionHeader({ id, eyebrow, title, children }) {
  return (
    <div className="mb-10 grid gap-4 md:mb-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-12">
      <div>
        <p className="eyebrow mb-4" id={id ? `${id}-label` : undefined}>
          {eyebrow}
        </p>
        <h2 className="text-3xl font-semibold leading-[1.05] tracking-[-0.035em] text-balance sm:text-[2.6rem]">{title}</h2>
      </div>
      {children && <p className="max-w-[52ch] text-[15px] leading-relaxed text-fg-muted md:justify-self-end">{children}</p>}
    </div>
  );
}

const FACTS = [
  ["6", "Tree-sitter grammars"],
  ["3072-d", "Gemini embeddings"],
  ["~30s", "to index a small repo"],
  ["[n]", "line-level citations"],
];

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-ink-950">
      <LandingNav />

      <main>
        {/* ---------------------------------------------------------- Hero */}
        <section className="relative">
          <div className="bg-grid fade-mask-b pointer-events-none absolute inset-x-0 -top-16 h-[680px]" aria-hidden="true" />
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(900px,90vw)] -translate-x-1/2 bg-gradient-to-r from-transparent via-signal/40 to-transparent"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
            <div className="animate-fade-up">
              <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border hairline-strong bg-ink-900/80 py-1 pl-1.5 pr-3 font-mono text-[11px] text-fg-muted">
                <span className="rounded-full bg-signal px-2 py-0.5 font-medium text-signal-ink">RAG</span>
                AST-aware retrieval for GitHub repositories
              </p>
              <h1 className="max-w-4xl text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.045em] text-balance sm:text-6xl lg:text-[5.25rem]">
                Read any codebase <em className="font-serif font-normal italic tracking-[-0.02em] text-signal">like you wrote it.</em>
              </h1>
              <p className="mt-8 max-w-[56ch] text-base leading-relaxed text-fg-muted sm:text-[17px]">
                Zenoryx parses a repository into its real syntax tree, embeds every function and class, and answers your
                questions in a live stream — with every claim cited down to the file and line it came from.
              </p>
              <HeroForm className="mt-8" />
            </div>

            <div className="mt-14 animate-fade-up [animation-delay:150ms] sm:mt-16">
              <XRayDemo />
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border hairline bg-[var(--line)] sm:grid-cols-4">
              {FACTS.map(([value, label]) => (
                <div key={label} className="bg-ink-950 px-5 py-4">
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="block font-mono text-xl tracking-tight text-fg">{value}</span>
                    <span className="mt-1 block text-xs text-fg-subtle">{label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------------------------------------------- Why AST */}
        <section id="chunking" className="scroll-mt-20 border-t hairline">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeader
              eyebrow="01 — Why it works"
              title={
                <>
                  Chunk by syntax, <em className="font-serif font-normal italic">not by size.</em>
                </>
              }
            >
              Most RAG pipelines slice files every N characters, cutting functions in half and orphaning signatures from their
              bodies. Zenoryx walks the abstract syntax tree and keeps declarations whole — then sweeps up the top-level glue so
              nothing is silently dropped.
            </SectionHeader>
            <ChunkingCompare />
          </div>
        </section>

        {/* ---------------------------------------------------- Pipeline */}
        <section id="how" className="scroll-mt-20 border-t hairline">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeader eyebrow="02 — How it works" title="From URL to answers in five stages.">
              Paste a public repository. A durable background job ranks the files that matter, parses, summarizes and embeds
              them, then reads the recent commit history — all streamed to a live progress view.
            </SectionHeader>
            <PipelineTrack />
          </div>
        </section>

        {/* ------------------------------------------------ Architecture */}
        <section id="architecture" className="scroll-mt-20 border-t hairline">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeader
              eyebrow="03 — Architecture"
              title={
                <>
                  Small surface area. <em className="font-serif font-normal italic">No idle infrastructure.</em>
                </>
              }
            >
              One Node process serves the API and runs ingestion; Postgres stores vectors, sessions and job state. The browser
              only ever talks to its own origin, so session cookies stay first-party.
            </SectionHeader>
            <Architecture />
            <div className="mt-16">
              <SpecGrid />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- Final CTA */}
        <section className="relative overflow-hidden border-t hairline">
          <div className="bg-dots fade-mask-y pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-24 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-32">
            <h2 className="max-w-3xl text-4xl font-semibold leading-[1] tracking-[-0.045em] text-balance sm:text-6xl">
              Point it at a repo. <em className="font-serif font-normal italic text-signal">Ask it anything.</em>
            </h2>
            <CtaButtons />
          </div>
        </section>
      </main>

      <footer className="border-t hairline">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo compact />
            <span>© {new Date().getFullYear()} Zenoryx</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="font-mono">Built with Next.js, Express, pgvector</span>
            <Link href="/login" className="hover:text-fg">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
