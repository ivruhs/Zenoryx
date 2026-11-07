import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SnippingScissors, TornEdge } from "@/components/landing/Doodles";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-5 py-6 sm:px-10">
      <div aria-hidden="true" className="halftone halftone-fade pointer-events-none absolute -right-32 top-10 size-[480px] opacity-50" />
      <Link href="/" className="relative w-fit transition-transform hover:-rotate-3" aria-label="Zenoryx home">
        <Logo />
      </Link>
      <main className="relative flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-xl">
          {/* the torn-off sheet */}
          <div className="relative -rotate-2 drop-shadow-[6px_8px_0_rgba(31,28,23,0.9)]">
            <div className="rounded-t-2xl border-x-[1.5px] border-t-[1.5px] border-ink bg-paper-2 px-7 pb-6 pt-8 sm:px-10">
              <p className="eyebrow">error · 404</p>
              <p
                className="misreg mt-2 font-display text-[7rem] font-extrabold leading-[0.8] tracking-[-0.04em] sm:text-[9rem]"
                style={{ fontVariationSettings: '"wdth" 78' }}
                aria-hidden="true"
              >
                404
              </p>
              <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                This page got <span className="marker marker-pink">cut.</span>
              </h1>
              <p className="mt-3 text-[16px] text-ink-2">
                We looked along every seam and found nothing at this address. It may have moved, or never existed.
              </p>
            </div>
            <TornEdge flip className="-mt-px" />
          </div>
          {/* the snipped-off strip with the scissors still in it */}
          <div className="relative mt-6 flex items-center gap-3 pl-2" aria-hidden="true">
            <SnippingScissors className="w-12 shrink-0" />
            <span className="h-0 flex-1 border-t-2 border-dashed border-ink/50" />
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/" className="btn btn-secondary">
              <ArrowLeft className="size-4" /> Back home
            </Link>
            <Link href="/dashboard" className="btn btn-pink">
              Open dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
