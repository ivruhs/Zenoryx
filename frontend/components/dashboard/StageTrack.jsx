import { STAGES, overallProgress, stageIndex } from "@/lib/pipeline";
import { cn } from "@/lib/format";

/** A little print-run strip: five plates, the overall %, and a handwritten note. */
export function StageTrack({ project, className }) {
  const stage = project.progress?.stage || project.stage || "queued";
  const current = stageIndex(stage);
  const meta = STAGES[current];
  const { done = 0, total = 0, queuePosition = 0 } = project.progress || {};
  const frac = total > 0 ? Math.min(1, done / total) : 0;
  const processing = project.status === "PROCESSING";

  let label = "Waiting in the queue";
  if (project.status === "PENDING" && queuePosition > 1) label = `Queued · position ${queuePosition}`;
  if (meta) label = meta.verb;

  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-3">
        <span className="hand text-lg leading-none text-pink-deep">{meta?.note || "next in line"}</span>
        {processing && (
          <span className="font-mono text-xl font-bold tabular-nums leading-none text-ink">
            {overallProgress(project)}
            <span className="text-sm text-ink-3">%</span>
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {STAGES.map((s, i) => (
          <span key={s.id} className="relative h-2.5 flex-1 overflow-hidden rounded-[4px] border-[1.5px] border-ink bg-paper">
            {i < current && <span className="absolute inset-0 bg-green" />}
            {i === current && (
              <span
                className="absolute inset-y-0 left-0 bg-orange transition-[width] duration-500 [background-image:repeating-linear-gradient(-45deg,transparent_0_4px,rgba(255,255,255,.35)_4px_8px)] animate-march"
                style={{ width: `${Math.max(frac, 0.15) * 100}%` }}
              />
            )}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[11px]">
        <span className={cn("truncate", meta ? "text-ink-2" : "text-ink-3")}>{label}</span>
        {total > 0 && meta && (
          <span className="shrink-0 tabular-nums text-ink-3">
            {done}/{total}
          </span>
        )}
      </div>
      <span className="sr-only">
        Stage {Math.max(current + 1, 0)} of {STAGES.length}: {label}
        {processing ? `, ${overallProgress(project)}% complete` : ""}
      </span>
    </div>
  );
}
