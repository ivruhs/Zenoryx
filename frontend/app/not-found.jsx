import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-ink-950 px-5 py-6 sm:px-10">
      <div className="bg-grid fade-mask-y pointer-events-none absolute inset-0" aria-hidden="true" />
      <Link href="/" className="relative w-fit" aria-label="Zenoryx home">
        <Logo />
      </Link>
      <main className="relative flex flex-1 items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="panel-raised overflow-hidden font-mono text-[12.5px]">
            <div className="flex h-9 items-center border-b hairline px-4 text-[11px] text-fg-subtle">query.log</div>
            <div className="space-y-1 px-5 py-4 leading-relaxed">
              <p className="text-fg">
                <span className="text-signal">❯</span> resolve <span className="text-fg-muted">this route</span>
              </p>
              <p className="text-fg-subtle">walking AST… 0 nodes matched</p>
              <p className="text-coral">error 404: no declaration found at this path</p>
            </div>
          </div>
          <h1 className="mt-10 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Nothing indexed <em className="font-serif font-normal italic text-signal">here.</em>
          </h1>
          <p className="mt-3 text-[15px] text-fg-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-secondary">
              <ArrowLeft className="size-4" /> Back home
            </Link>
            <Link href="/dashboard" className="btn btn-primary">
              Open dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
