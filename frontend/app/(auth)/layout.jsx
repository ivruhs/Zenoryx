import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { TerminalPanel } from "@/components/auth/TerminalPanel";

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh bg-ink-950 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <Link href="/" className="w-fit" aria-label="Zenoryx home">
          <Logo />
        </Link>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[380px] animate-fade-up">{children}</div>
        </main>
        <p className="font-mono text-[11px] text-fg-faint">Free forever · no card · public repositories only</p>
      </div>

      <aside className="relative hidden overflow-hidden border-l hairline bg-ink-900 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="bg-dots fade-mask-y pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative w-full max-w-[560px]">
          <p className="eyebrow mb-5">Session replay</p>
          <h2 className="mb-8 max-w-md text-3xl font-semibold leading-[1.05] tracking-[-0.035em]">
            Index once. <em className="font-serif font-normal italic text-signal">Ask forever.</em>
          </h2>
          <TerminalPanel />
          <p className="mt-5 font-mono text-[11px] text-fg-subtle">Timings and output from a real run against expressjs/cors.</p>
        </div>
      </aside>
    </div>
  );
}
