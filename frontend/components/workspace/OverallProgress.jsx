"use client";

import { useEffect, useRef, useState } from "react";
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

/** Big "% complete" readout with a full-width bar and a pace-based ETA. */
export function OverallProgress({ project, elapsedMs }) {
  const pct = useOverallProgress(project);
  const failed = project.status === "FAILED";
  const queued = project.status === "PENDING";

  // ETA from observed pace, smoothed so it doesn't jitter between polls.
  const [eta, setEta] = useState(null);
  useEffect(() => {
    if (queued || failed || pct < 8 || !elapsedMs) return setEta(null);
    const raw = (elapsedMs * (100 - pct)) / pct;
    setEta((prev) => (prev == null ? raw : prev * 0.7 + raw * 0.3));
  }, [pct, elapsedMs, queued, failed]);

  const label = failed ? "Stopped" : queued ? "Waiting to start" : pct >= 99 ? "Finishing up" : "Indexing";
  const etaText = eta == null ? null : eta < 15_000 ? "a few seconds left" : `~${duration(Math.round(eta / 5000) * 5000)} left`;

  return (
    <section className="panel-raised mb-5 p-5 sm:p-6" aria-label="Overall progress">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{label}</div>
          <div
            className={cn("font-mono text-5xl font-medium tabular-nums tracking-tight sm:text-6xl", failed ? "text-coral" : "text-fg")}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Indexing progress"
          >
            {pct}
            <span className="text-2xl text-fg-subtle sm:text-3xl">%</span>
          </div>
        </div>
        <div className="pb-1.5 text-right font-mono text-xs text-fg-subtle">
          {etaText && <div className="text-fg-muted">{etaText}</div>}
          <div>{100 - pct}% remaining</div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-800">
        <div
          className={cn(
            "relative h-full rounded-full transition-[width] duration-700 ease-out",
            failed ? "bg-coral/70" : "bg-gradient-to-r from-amber to-signal",
          )}
          style={{ width: `${Math.max(pct, queued ? 0 : 2)}%` }}
        >
          {!failed && !queued && (
            <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] bg-[length:200%_100%]" />
          )}
        </div>
      </div>
    </section>
  );
}
