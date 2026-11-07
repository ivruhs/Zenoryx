import { STAGES, overallProgress, stageIndex } from "@/lib/pipeline";
import { cn } from "@/lib/format";

/** Compact 5-segment pipeline track for in-flight projects. */
export function StageTrack({ project, className }) {
  const stage = project.progress?.stage || project.stage || "queued";
  const current = stageIndex(stage);
  const meta = STAGES[current];
  const { done = 0, total = 0, queuePosition = 0 } = project.progress || {};
  const frac = total > 0 ? Math.min(1, done / total) : 0;

  let label = "Waiting in queue";
  if (project.status === "PENDING" && queuePosition > 1) label = `Queued · position ${queuePosition}`;
  if (meta) label = meta.verb;

  return (
    <div className={className}>
      <div className="flex gap-1" aria-hidden="true">
        {STAGES.map((s, i) => (
          <span key={s.id} className="relative h-1 flex-1 overflow-hidden rounded-full bg-ink-750">
            {i < current && <span className="absolute inset-0 bg-signal/70" />}
            {i === current && (
              <>
                <span className="absolute inset-y-0 left-0 bg-amber transition-[width] duration-500" style={{ width: `${Math.max(frac, 0.12) * 100}%` }} />
                <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)] bg-[length:200%_100%]" />
              </>
            )}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[11px]">
        <span className={cn("truncate", meta ? "text-amber" : "text-fg-subtle")}>{label}</span>
        {project.status === "PROCESSING" && (
          <span className="shrink-0 tabular-nums text-fg-muted">{overallProgress(project)}%</span>
        )}
      </div>
      <span className="sr-only">
        Stage {Math.max(current + 1, 0)} of {STAGES.length}: {label}
      </span>
    </div>
  );
}
