import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ReceiptPanel } from "@/components/auth/ReceiptPanel";
import { HandArrow } from "@/components/landing/Doodles";

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <Link href="/" className="w-fit transition-transform hover:-rotate-3" aria-label="Zenoryx home">
          <Logo />
        </Link>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="tape w-full max-w-[420px] animate-fade-up" style={{ "--tape-r": "-2deg" }}>
            <div className="paper px-6 pb-8 pt-9 sm:px-9">{children}</div>
          </div>
        </main>
        <p className="font-mono text-[11px] text-ink-3">free forever · no card · public repositories only</p>
      </div>

      <aside className="relative hidden overflow-hidden border-l-[1.5px] border-ink bg-paper-3 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div aria-hidden="true" className="graph-paper pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="halftone halftone-fade pointer-events-none absolute -right-28 -top-28 size-[460px] opacity-70"
        />
        <div
          aria-hidden="true"
          className="halftone halftone-fade pointer-events-none absolute -bottom-32 -left-24 size-[380px] opacity-50 [--ht:var(--color-blue)]"
        />
        <div className="relative w-full max-w-[460px]">
          <h2
            className="font-display text-5xl font-extrabold leading-[0.9] tracking-[-0.03em]"
            style={{ fontVariationSettings: '"wdth" 82' }}
          >
            Index once.
            <br />
            <span className="marker marker-pink">Ask forever.</span>
          </h2>
          <div className="relative mt-10">
            <ReceiptPanel />
            <div className="pointer-events-none absolute -left-24 top-28 hidden w-28 xl:block" aria-hidden="true">
              <p className="hand -rotate-6 text-2xl text-pink-deep">a real run, reprinted</p>
              <HandArrow variant="right" className="mt-1 w-20" color="var(--color-pink-deep)" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
