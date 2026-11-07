"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-ink-950 px-5">
      <div className="w-full max-w-md text-center">
        <LogoMark className="mx-auto size-10 text-fg-subtle" />
        <p className="eyebrow mt-8 text-coral">Unexpected error</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Something broke on our side.</h1>
        <p className="mt-3 text-[15px] text-fg-muted">
          The interface hit an error it couldn&apos;t recover from. Your repositories and conversations are safe.
        </p>
        {error?.digest && <p className="mt-4 font-mono text-[11px] text-fg-faint">ref {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={() => reset()} className="btn btn-primary">
            <RotateCcw className="size-4" /> Try again
          </button>
          <Link href="/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
