import { cn } from "@/lib/format";
import { STAGES } from "@/lib/pipeline";

const STYLES = {
  READY: { dot: "bg-signal", text: "text-signal", label: "Ready" },
  PROCESSING: { dot: "bg-amber animate-pulse-dot", text: "text-amber", label: "Indexing" },
  PENDING: { dot: "bg-fg-subtle animate-pulse-dot", text: "text-fg-muted", label: "Queued" },
  FAILED: { dot: "bg-coral", text: "text-coral", label: "Failed" },
};

export function StatusPill({ status, stage, className }) {
  const s = STYLES[status] || STYLES.PENDING;
  const stageLabel = status === "PROCESSING" ? STAGES.find((x) => x.id === stage)?.label : null;
  return (
    <span className={cn("chip gap-2 bg-ink-900", s.text, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
      {stageLabel && <span className="text-fg-subtle">· {stageLabel.toLowerCase()}</span>}
    </span>
  );
}
