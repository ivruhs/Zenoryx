import { cn } from "@/lib/format";
import { STAGES } from "@/lib/pipeline";

const STYLES = {
  READY: { color: "var(--color-green)", label: "Ready", r: "-4deg" },
  PROCESSING: { color: "var(--color-orange)", label: "Printing", r: "3deg" },
  PENDING: { color: "var(--color-ink-3)", label: "Queued", r: "-2deg" },
  FAILED: { color: "var(--color-pink-deep)", label: "Jammed", r: "5deg" },
};

/** Status as a rubber stamp. */
export function StatusPill({ status, stage, className, animate = false }) {
  const s = STYLES[status] || STYLES.PENDING;
  const stageLabel = status === "PROCESSING" ? STAGES.find((x) => x.id === stage)?.label : null;
  return (
    <span
      className={cn("stamp", animate && "animate-stamp", className)}
      style={{ "--stamp": s.color, "--r": s.r }}
      title={stageLabel ? `${s.label} · ${stageLabel}` : s.label}
    >
      {status === "PROCESSING" && <span className="size-1.5 animate-pulse-dot rounded-full bg-current" />}
      {s.label}
      {stageLabel && <span className="opacity-70">· {stageLabel}</span>}
    </span>
  );
}
