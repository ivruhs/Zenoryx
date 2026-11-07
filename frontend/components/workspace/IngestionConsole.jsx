"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, ExternalLink, RotateCcw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import { STAGES, stageIndex } from "@/lib/pipeline";
import { cn, duration, formatCount } from "@/lib/format";
import { langMeta } from "@/lib/languages";
import { LanguageBar } from "@/components/ui/LanguageBar";
import { Spinner } from "@/components/ui/Spinner";
import { StatusPill } from "@/components/ui/StatusPill";
import { OverallProgress } from "./OverallProgress";

function useElapsed(since, running) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  return since ? Math.max(0, now - new Date(since).getTime()) : 0;
}

/** Client-side event log derived from successive status snapshots. */
function useEventLog(project) {
  const [lines, setLines] = useState([]);
  const last = useRef({});
  useEffect(() => {
    if (!project) return;
    const p = project.progress || {};
    const stage = project.status === "PENDING" ? "queued" : project.stage;
    const push = (text, tone = "muted") =>
      setLines((l) => [...l.slice(-60), { t: new Date(), text, tone, key: `${Date.now()}-${Math.random()}` }]);
    const prev = last.current;

    if (stage !== prev.stage) {
      if (stage === "queued") push(project.progress?.queuePosition > 1 ? `queued · position ${project.progress.queuePosition}` : "job queued · waiting for runner");
      if (stage === "fetching") push(`resolving ${project.repoOwner}/${project.repoName} · ranking source files`);
      if (stage === "parsing")
        push(`selected ${project.fileCount} of ${project.totalFiles} files · downloading from raw CDN`, "fg");
      if (stage === "summarizing") push(`tree-sitter produced chunks for ${p.total || project.fileCount} files`, "fg");
      if (stage === "embedding") push(`${p.total || "all"} chunks → gemini-embedding-001 (3072-d)`, "fg");
      if (stage === "commits") push("vectors stored in pgvector · summarizing recent commits", "fg");
      if (stage && prev.stage && stageIndex(stage) > stageIndex(prev.stage) && prev.stage !== "queued") {
        const done = STAGES[stageIndex(prev.stage)];
        if (done) push(`✓ ${done.label.toLowerCase()} complete`, "signal");
      }
    } else if (p.total && p.done !== prev.done && p.done > 0) {
      const unit = stage === "embedding" ? "chunks" : "files";
      if (p.done === p.total || p.done - (prev.loggedDone || 0) >= Math.max(1, Math.ceil(p.total / 6))) {
        push(`${stage} ${p.done}/${p.total} ${unit}`);
        last.current.loggedDone = p.done;
      }
    }
    if (project.status === "FAILED" && prev.status !== "FAILED") push(`✕ ${project.errorMessage || "ingestion failed"}`, "coral");
    if (project.errorMessage?.startsWith("Retrying") && prev.error !== project.errorMessage) push(project.errorMessage, "amber");

    last.current = { ...last.current, stage, done: p.done, status: project.status, error: project.errorMessage };
  }, [project]);
  return lines;
}

function StageRow({ stage, index, current, project }) {
  const state = index < current ? "done" : index === current ? "active" : "pending";
  const p = project.progress || {};
  const pct = state === "active" && p.total ? Math.min(100, (p.done / p.total) * 100) : state === "done" ? 100 : 0;
  return (
    <li className="relative grid grid-cols-[2.25rem_1fr] gap-4 pb-6 last:pb-0">
      {index < STAGES.length - 1 && (
        <span className={cn("absolute left-[1.0625rem] top-9 h-[calc(100%-2.25rem)] w-px", index < current ? "bg-signal/50" : "bg-[var(--line-strong)]")} />
      )}
      <span
        className={cn(
          "relative z-10 grid size-9 place-items-center rounded-full border font-mono text-xs transition-colors duration-500",
          state === "done" && "border-signal/50 bg-signal/10 text-signal",
          state === "active" && "border-amber/60 bg-amber/10 text-amber shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-amber)_8%,transparent)]",
          state === "pending" && "border-[var(--line-strong)] bg-ink-900 text-fg-faint",
        )}
      >
        {state === "done" ? <Check className="size-4" /> : state === "active" ? <Spinner className="size-4" /> : `0${index + 1}`}
      </span>
      <div className="min-w-0 pt-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className={cn("text-sm font-medium", state === "pending" ? "text-fg-subtle" : "text-fg")}>{stage.verb}</span>
          <span className="font-mono text-[11px] text-fg-subtle">
            {state === "active" && p.total ? `${p.done}/${p.total}` : stage.hint}
          </span>
        </div>
        {state !== "pending" && (
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-ink-800">
            <div
              className={cn("h-full rounded-full transition-[width] duration-700 ease-out", state === "done" ? "bg-signal/60" : "bg-amber")}
              style={{ width: `${state === "active" && !p.total ? 35 : pct}%` }}
            >
              {state === "active" && !p.total && <div className="h-full w-full animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)] bg-[length:200%_100%]" />}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export function IngestionConsole({ project }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const failed = project.status === "FAILED";
  const running = project.status === "PROCESSING";
  const elapsed = useElapsed(project.startedAt || project.createdAt, !failed);
  const lines = useEventLog(project);
  const logRef = useRef(null);
  const current = project.status === "PENDING" ? -1 : stageIndex(project.stage);
  const stalled = elapsed > 5 * 60_000 && !failed;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  const retry = useMutation({
    mutationFn: () => api.post(`/projects/${project.id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.project(project.id) });
      queryClient.invalidateQueries({ queryKey: qk.projects });
      toast("Retrying ingestion");
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/projects/${project.id}`),
    onSuccess: () => {
      queryClient.setQueryData(qk.projects, (old) => old?.filter((p) => p.id !== project.id));
      toast("Repository removed");
      router.replace("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-dots fade-mask-b opacity-60" />
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg">
          <ArrowLeft className="size-3.5" /> Repositories
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusPill status={project.status} stage={project.stage} />
              {project.stars != null && (
                <span className="chip">
                  <Star className="size-3" /> {formatCount(project.stars)}
                </span>
              )}
              {project.primaryLanguage && <span className="chip">{project.primaryLanguage}</span>}
            </div>
            <h1 className="truncate text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              <span className="text-fg-subtle">{project.repoOwner}/</span>
              {project.repoName}
            </h1>
            {project.description && <p className="mt-2 max-w-2xl text-[15px] text-fg-muted">{project.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-6 font-mono text-xs text-fg-subtle">
            <div>
              <div className="eyebrow mb-1">Elapsed</div>
              <div className="text-lg tabular-nums text-fg">{duration(elapsed)}</div>
            </div>
            <div>
              <div className="eyebrow mb-1">Files</div>
              <div className="text-lg tabular-nums text-fg">
                {project.fileCount || "—"}
                {project.totalFiles > project.fileCount && <span className="text-fg-subtle">/{project.totalFiles}</span>}
              </div>
            </div>
          </div>
        </div>

        {failed ? (
          <div className="panel mb-6 border-coral/30 bg-coral/[0.04] p-5 sm:p-6">
            <div className="flex gap-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-coral" />
              <div className="min-w-0 flex-1">
                <h2 className="font-medium text-fg">Indexing failed</h2>
                <p className="mt-1 break-words text-sm text-fg-muted">{project.errorMessage || "An unknown error interrupted the pipeline."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => retry.mutate()} disabled={retry.isPending}>
                    {retry.isPending ? <Spinner /> : <RotateCcw className="size-3.5" />} Retry
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove.mutate()} disabled={remove.isPending}>
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <OverallProgress project={project} elapsedMs={elapsed} />

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <section className="panel-raised p-5 sm:p-7" aria-label="Pipeline progress">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="eyebrow">Pipeline</h2>
              {project.status === "PENDING" && (
                <span className="font-mono text-[11px] text-fg-subtle">
                  {project.progress?.retryInMs ? "retrying shortly" : project.progress?.queuePosition > 1 ? `#${project.progress.queuePosition} in queue` : "starting…"}
                </span>
              )}
            </div>
            <ol>
              {STAGES.map((s, i) => (
                <StageRow key={s.id} stage={s} index={i} current={failed ? -2 : current} project={project} />
              ))}
            </ol>
          </section>

          <section className="flex min-h-[320px] flex-col overflow-hidden rounded-[14px] border hairline bg-ink-950" aria-label="Activity log">
            <div className="flex h-10 items-center justify-between border-b hairline px-4">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-ink-700" />
                <span className="size-2.5 rounded-full bg-ink-700" />
                <span className="size-2.5 rounded-full bg-ink-700" />
              </div>
              <span className="font-mono text-[11px] text-fg-subtle">ingest.log</span>
              <span className={cn("size-1.5 rounded-full", running ? "animate-pulse-dot bg-amber" : failed ? "bg-coral" : "bg-fg-faint")} />
            </div>
            <div ref={logRef} className="scroll-thin flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-6" role="log" aria-live="polite">
              {lines.map((l) => (
                <div key={l.key} className="flex gap-3 animate-fade-in">
                  <span className="shrink-0 text-fg-faint">{l.t.toLocaleTimeString([], { hour12: false })}</span>
                  <span
                    className={cn(
                      "min-w-0 break-words",
                      l.tone === "signal" && "text-signal",
                      l.tone === "coral" && "text-coral",
                      l.tone === "amber" && "text-amber",
                      l.tone === "fg" && "text-fg",
                      l.tone === "muted" && "text-fg-muted",
                    )}
                  >
                    {l.text}
                  </span>
                </div>
              ))}
              {!failed && <div className="caret mt-1 text-fg-faint" />}
            </div>
          </section>
        </div>

        {Array.isArray(project.languages) && project.languages.length > 0 && (
          <div className="panel mt-5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="eyebrow">Selected sources</h2>
              <span className="font-mono text-[11px] text-fg-subtle">{langMeta(project.languages[0].language).label} heavy</span>
            </div>
            <LanguageBar languages={project.languages} legend max={6} />
          </div>
        )}

        {project.status === "PROCESSING" && project.stage === "embedding" && (project.progress?.total || 0) > 60 && (
          <p className="mt-5 flex items-center gap-2 font-mono text-[11px] text-fg-subtle">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-cyan" />
            Embedding is paced to stay inside Gemini&apos;s free quota (~30K tokens/min) — larger repositories take a couple of minutes.
          </p>
        )}

        {stalled && (
          <div className="panel mt-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">
              This is taking longer than usual — free-tier APIs may be rate limiting. You can keep waiting or remove the job.
            </p>
            <button type="button" className="btn btn-danger btn-sm shrink-0" onClick={() => remove.mutate()} disabled={remove.isPending}>
              <Trash2 className="size-3.5" /> Cancel & delete
            </button>
          </div>
        )}

        <p className="mt-8 flex items-center gap-2 text-xs text-fg-subtle">
          You can leave this page — indexing continues in the background and you&apos;ll be notified when it&apos;s ready.
          <a href={project.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-fg-muted hover:text-fg">
            GitHub <ExternalLink className="size-3" />
          </a>
        </p>
      </div>
    </main>
  );
}
