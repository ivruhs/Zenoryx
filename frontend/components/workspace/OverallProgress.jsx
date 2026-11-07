"use client";

import { useEffect, useRef, useState } from "react";
import { Scissors } from "lucide-react";
import { overallProgress } from "@/lib/pipeline";
import { cn, duration } from "@/lib/format";

/** Monotonic percentage: never jumps backwards between polls (resets on retry). */
export function useOverallProgress(project) {
  const raw = overallProgress(project);
  const best = useRef(0);
  if (project?.status === "PENDING" || project?.status === "FAILED") best.current = raw;
  else best.current = Math.max(best.current, raw);
  return best.current;
}

/** The "printing press": a giant stamped percentage, a paper-strip bar with scissors riding it, and a pace-based ETA. */
export function OverallProgress({ project, elapsedMs }) {
  const pct = useOverallProgress(project);
  const failed = project.status === "FAILED";
  const queued = project.status === "PENDING";

  const [eta, setEta] = useState(null);
  useEffect(() => {
    if (queued || failed || pct < 8 || !elapsedMs) return setEta(null);
    const raw = (elapsedMs * (100 - pct)) / pct;
    setEta((prev) => (prev == null ? raw : prev * 0.7 + raw * 0.3));
  }, [pct, elapsedMs, queued, failed]);

  const label = failed ? "Paper jam" : queued ? "Waiting for the press" : pct >= 99 ? "Final pass…" : "Now printing";
  const etaText = eta == null ? null : eta < 15_000 ? "a few seconds to go!" : `~${duration(Math.round(eta / 5000) * 5000)} to go`;

  return (
    <section className="paper relative mb-6 overflow-hidden p-5 sm:p-7" aria-label="Overall progress">
      <div className="halftone halftone-fade pointer-events-none absolute -right-10 -top-10 size-56 opacity-40" style={{ "--ht": "var(--color-yellow)" }} />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">{label}</div>
          <div
            className={cn("misreg font-display text-7xl font-extrabold leading-none tracking-[-0.06em] tabular-nums sm:text-8xl", failed ? "text-pink-deep" : "text-ink")}
            style={{ fontVariationSettings: '"wdth" 78' }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Indexing progress"
          >
            {pct}
            <span className="ml-1 text-4xl text-ink-3 sm:text-5xl">%</span>
          </div>
        </div>
        <div className="pb-2 text-right">
          {etaText && (
            <div className="hand -rotate-2 text-2xl text-pink-deep" aria-live="polite">
              {etaText}
            </div>
          )}
          <div className="font-mono text-xs text-ink-3">{100 - pct}% left to print</div>
        </div>
      </div>

      {/* paper strip with tick marks; scissors ride the leading edge */}
      <div className="relative mt-6">
        <div className="relative h-5 overflow-hidden rounded-full border-[1.5px] border-ink bg-paper">
          <div
            className="absolute inset-y-0 left-0 opacity-30"
            style={{ width: "100%", backgroundImage: "repeating-linear-gradient(90deg, var(--color-ink) 0 1px, transparent 1px 10%)" }}
          />
          <div
            className={cn("relative h-full border-r-[1.5px] border-ink transition-[width] duration-700 ease-out", failed ? "bg-pink-soft" : "bg-pink")}
            style={{ width: `${Math.max(pct, queued ? 0 : 3)}%` }}
          >
            {!failed && !queued && <span className="halftone absolute inset-0 opacity-40" style={{ "--ht": "var(--color-ink)" }} />}
          </div>
        </div>
        {!queued && (
          <span
            className="absolute -top-3.5 grid size-8 place-items-center rounded-full border-[1.5px] border-ink bg-yellow transition-[left] duration-700 ease-out"
            style={{ left: `calc(${Math.max(pct, 3)}% - 16px)` }}
            aria-hidden="true"
          >
            <Scissors className={cn("size-4 -rotate-90", !failed && "[animation:snip_0.6s_ease-in-out_infinite]")} />
          </span>
        )}
      </div>
    </section>
  );
}
