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
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="tape w-full max-w-md" style={{ "--tape-r": "3deg" }}>
        <div className="paper offset-pink px-7 pb-8 pt-9 text-center">
          <LogoMark className="mx-auto size-12 animate-wiggle" />
          <span
            className="stamp mt-7 animate-stamp text-sm"
            style={{ "--stamp": "var(--color-pink-deep)", "--r": "-6deg" }}
          >
            jammed
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-[-0.03em]">Paper jam.</h1>
          <p className="mt-3 text-[15px] text-ink-2">
            The interface hit an error it couldn&apos;t recover from. Your repositories and conversations are safe.
          </p>
          {error?.digest && <p className="mt-4 font-mono text-[11px] text-ink-3">ref {error.digest}</p>}
          <div className="mt-8 flex justify-center gap-4">
            <button type="button" onClick={() => reset()} className="btn btn-pink">
              <RotateCcw className="size-4" /> Try again
            </button>
            <Link href="/dashboard" className="btn btn-secondary">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
