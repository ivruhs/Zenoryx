import Link from "next/link";
import { Scissors } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { CtaButtons, HeroForm } from "@/components/landing/HeroForm";
import { CutDemo } from "@/components/landing/CutDemo";
import { ChunkingCompare } from "@/components/landing/ChunkingCompare";
import { PipelineTrack } from "@/components/landing/PipelineTrack";
import { Architecture } from "@/components/landing/Architecture";
import { SpecGrid } from "@/components/landing/SpecGrid";
import { HandArrow, Scribble } from "@/components/landing/Doodles";
import { Logo } from "@/components/ui/Logo";

function SectionHeader({ id, num, eyebrow, title, children }) {
  return (
    <div className="mb-12 grid gap-5 md:mb-16 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-end md:gap-12">
      <div>
        <p className="mb-4 flex items-center gap-3" id={id ? `${id}-label` : undefined}>
          <span className="grid size-9 place-items-center rounded-full border-[1.5px] border-ink bg-yellow font-display text-sm font-extrabold">
            {num}
          </span>
          <span className="eyebrow">{eyebrow}</span>
        </p>
        <h2 className="font-display text-[2.4rem] font-extrabold leading-[0.95] tracking-[-0.035em] text-balance sm:text-[3.4rem]">
          {title}
        </h2>
      </div>
      {children && <p className="max-w-[50ch] text-[16px] leading-relaxed text-ink-2 md:justify-self-end">{children}</p>}
    </div>
  );
}

const STUBS = [
  ["6", "Tree-sitter grammars", "bg-yellow"],
  ["3072", "dimensions per chunk", "bg-pink"],
  ["30s", "or so to cut a small repo", "bg-blue-soft"],
  ["[n]", "citations to the line", "bg-green-soft"],
];

function TicketStub({ value, label, tint, i }) {
  return (
    <div
      className="relative flex items-stretch overflow-hidden rounded-xl border-[1.5px] border-ink bg-paper-2 shadow-[3px_3px_0_0_var(--color-ink)]"
      style={{ transform: `rotate(${[-1, 0.8, -0.6, 1][i]}deg)` }}
    >
      <div className={`grid w-[42%] place-items-center border-r-2 border-dashed border-ink/40 px-2 py-4 ${tint}`}>
        <span className="font-display text-3xl font-extrabold tracking-tighter sm:text-4xl" style={{ fontVariationSettings: '"wdth" 80' }}>
          {value}
        </span>
      </div>
      <div className="flex items-center px-3 py-3 font-mono text-[11px] leading-snug text-ink-2 sm:text-xs">{label}</div>
      {/* punched notches */}
      <span className="absolute left-[42%] top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-ink bg-paper" />
      <span className="absolute bottom-0 left-[42%] size-3 -translate-x-1/2 translate-y-1/2 rounded-full border-[1.5px] border-ink bg-paper" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <LandingNav />

      <main>
        {/* ---------------------------------------------------------- Hero */}
        <section className="relative">
          <div
            aria-hidden="true"
            className="halftone halftone-fade pointer-events-none absolute -right-24 -top-10 size-[420px] opacity-60 sm:size-[560px]"
          />
          <div
            aria-hidden="true"
            className="halftone halftone-fade pointer-events-none absolute -left-40 top-[420px] size-[380px] opacity-40 [--ht:var(--color-blue)]"
          />

          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24">
            <div className="mb-8 flex flex-wrap items-center gap-3 animate-fade-up">
              <span className="sticker bg-yellow" style={{ "--r": "-4deg" }}>
                AST-powered
              </span>
              <span className="sticker bg-pink" style={{ "--r": "3deg" }}>
                free forever
              </span>
              <span className="sticker bg-blue-soft" style={{ "--r": "-1.5deg" }}>
                cites its sources
              </span>
            </div>

            <h1
              className="max-w-5xl font-display text-[3.1rem] font-extrabold leading-[0.9] tracking-[-0.035em] text-balance animate-fade-up sm:text-[5rem] lg:text-[6.4rem]"
              style={{ fontVariationSettings: '"wdth" 92, "opsz" 96' }}
            >
              Cut any codebase into{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="misreg text-ink">answers.</span>
                <Scribble className="absolute -bottom-2 left-0 h-3 w-full sm:-bottom-3 sm:h-4" />
              </span>
            </h1>

            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
              <div className="animate-fade-up [animation-delay:120ms]">
                <p className="max-w-[54ch] text-[17px] leading-relaxed text-ink-2 sm:text-lg">
                  Zenoryx snips a GitHub repository along its real seams — functions, classes, methods — files every piece in a
                  vector index, then pastes the right ones back together as a streamed answer, with every claim cited to{" "}
                  <span className="marker text-ink">the exact line it came from.</span>
                </p>
                <div className="relative mt-10 max-w-xl">
                  <div className="pointer-events-none mb-1 ml-6 flex items-end gap-1" aria-hidden="true">
                    <p className="hand -rotate-3 text-[1.65rem] text-pink-deep">paste any public repo</p>
                    <HandArrow variant="down" className="mb-[-14px] w-9" color="var(--color-pink-deep)" />
                  </div>
                  <HeroForm />
                </div>
              </div>

              {/* facts, collaged as ticket stubs */}
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-2 lg:grid-cols-1 lg:gap-6 lg:pl-10 xl:pl-20">
                {STUBS.map(([value, label, tint], i) => (
                  <div key={label} className="animate-pop" style={{ animationDelay: `${250 + i * 90}ms`, "--r": "0deg" }}>
                    <dt className="sr-only">{label}</dt>
                    <dd className={i % 2 ? "lg:ml-10" : ""}>
                      <TicketStub value={value} label={label} tint={tint} i={i} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mt-20 animate-fade-up [animation-delay:200ms] sm:mt-24">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <span className="sticker bg-paper-2 text-sm" style={{ "--r": "-2deg" }}>
                  <Scissors className="size-3.5" /> live demo · what happens to your repo
                </span>
                <span className="hand hidden text-xl text-ink-3 md:block">real chunker logic, fake file</span>
              </div>
              <CutDemo />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- Why cut */}
        <section id="chunking" className="scroll-mt-20 border-t-[1.5px] border-dashed border-ink/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeader
              num="01"
              eyebrow="why cut along the seams?"
              title={
                <>
                  Chunk by <span className="marker marker-pink">syntax</span>, not by size.
                </>
              }
            >
              Most RAG pipelines slice files every N characters, sawing functions in half and orphaning signatures from their
              bodies. Zenoryx walks the abstract syntax tree and keeps declarations whole — then sweeps up the top-level glue so
              nothing is silently dropped.
            </SectionHeader>
            <ChunkingCompare />
          </div>
        </section>

        {/* ---------------------------------------------------- Pipeline */}
        <section id="how" className="scroll-mt-20 border-t-[1.5px] border-dashed border-ink/30 bg-paper-3/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeader
              num="02"
              eyebrow="how it works"
              title={
                <>
                  From URL to answers in <span className="marker marker-blue">five</span> panels.
                </>
              }
            >
              Paste a public repository. A durable background job ranks the files that matter, cuts, annotates and embeds them,
              then reads the recent commit history — with a live progress page while you wait.
            </SectionHeader>
            <PipelineTrack />
          </div>
        </section>

        {/* ------------------------------------------------ Architecture */}
        <section id="architecture" className="scroll-mt-20 border-t-[1.5px] border-dashed border-ink/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeader
              num="03"
              eyebrow="under the hood"
              title={
                <>
                  Small surface area. <span className="marker marker-green">No idle infra.</span>
                </>
              }
            >
              One Node process serves the API and runs ingestion; Postgres holds vectors, sessions and the job queue. The browser
              only ever talks to its own origin, so session cookies stay first-party.
            </SectionHeader>
            <Architecture />
            <div className="mt-20">
              <SpecGrid />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- Coupon CTA */}
        <section className="border-t-[1.5px] border-dashed border-ink/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="relative rounded-[22px] border-[3px] border-dashed border-ink bg-yellow p-2 sm:p-3">
              <Scissors className="absolute -top-[15px] left-10 size-7 rotate-180 bg-paper px-0.5 text-ink" aria-hidden="true" />
              <div className="halftone relative overflow-hidden rounded-2xl border-[1.5px] border-ink bg-paper-2 [--ht:var(--color-yellow-soft)]">
                <div className="relative grid gap-8 p-7 sm:p-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div>
                    <p className="eyebrow mb-4">coupon · no. 0001 · valid forever</p>
                    <h2
                      className="font-display text-[2.6rem] font-extrabold leading-[0.92] tracking-[-0.035em] text-balance sm:text-6xl"
                      style={{ fontVariationSettings: '"wdth" 85' }}
                    >
                      Good for one codebase, <span className="marker marker-pink">fully explained.</span>
                    </h2>
                    <p className="mt-5 max-w-[48ch] text-[16px] text-ink-2">
                      Point it at a repo. Ask it anything. No card, no trial timer — it runs entirely on free tiers.
                    </p>
                  </div>
                  <CtaButtons />
                </div>
                <span
                  className="stamp absolute right-5 top-5 text-sm sm:right-10 sm:top-8 sm:text-base"
                  style={{ "--stamp": "var(--color-pink-deep)", "--r": "12deg" }}
                  aria-hidden="true"
                >
                  $0.00
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-[1.5px] border-ink bg-paper-2">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="font-mono text-xs">printed with Next.js, Express & pgvector</span>
            <Link href="/login" className="font-display font-semibold text-ink hover:underline hover:decoration-pink hover:decoration-2 hover:underline-offset-4">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
