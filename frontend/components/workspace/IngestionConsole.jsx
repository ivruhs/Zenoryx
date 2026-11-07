"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, GitBranch, RotateCcw, Scissors, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import { STAGES, stageIndex } from "@/lib/pipeline";
import { cn, duration, formatCount } from "@/lib/format";
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
    <li className="relative grid grid-cols-[2.5rem_1fr] gap-4 pb-6 last:pb-0">
      {index < STAGES.length - 1 && (
        <span
          className={cn("absolute left-[1.2rem] top-11 h-[calc(100%-2.75rem)] border-l-2 border-dashed", index < current ? "border-green" : "border-ink-4")}
        />
      )}
      <span
        className={cn(
          "relative z-10 grid size-10 place-items-center rounded-full border-[1.5px] font-mono text-xs font-bold transition-all duration-500",
          state === "done" && "-rotate-6 border-ink bg-green text-paper-2",
          state === "active" && "border-ink bg-yellow text-ink shadow-[3px_3px_0_0_var(--color-ink)]",
          state === "pending" && "border-ink-4 bg-paper-2 text-ink-4",
        )}
      >
        {state === "done" ? <Check className="size-4" strokeWidth={3} /> : state === "active" ? <Spinner className="size-4" /> : `0${index + 1}`}
      </span>
      <div className="min-w-0 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className={cn("font-display text-[15px] font-semibold", state === "pending" ? "text-ink-4" : "text-ink")}>
            <span className="mr-2 font-mono text-[11px] font-normal uppercase tracking-wide text-ink-3">{stage.label}</span>
            {stage.verb}
          </span>
          <span className="font-mono text-[11px] text-ink-3">{state === "active" && p.total ? `${p.done}/${p.total}` : stage.hint}</span>
        </div>
        {state === "active" && <div className="hand mt-0.5 -rotate-1 text-lg text-pink-deep">{stage.note}</div>}
        {state !== "pending" && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-3">
            <div
              className={cn("h-full rounded-full transition-[width] duration-700 ease-out", state === "done" ? "bg-green" : "bg-orange")}
              style={{ width: `${state === "active" && !p.total ? 35 : pct}%` }}
            />
          </div>
        )}
      </div>
    </li>
  );
}

const TONES = { signal: "text-green", coral: "text-pink-deep", amber: "text-orange", fg: "text-ink", muted: "text-ink-2" };

export function IngestionConsole({ project }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const failed = project.status === "FAILED";
  const running = project.status === "PROCESSING";
  const elapsed = useElapsed(project.status === "PROCESSING" ? project.startedAt : null, running);
  const lines = useEventLog(project);
  const logRef = useRef(null);
  const current = project.status === "PENDING" ? -1 : stageIndex(project.stage);
  const stalled = running && elapsed > 5 * 60_000;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  const retry = useMutation({
    mutationFn: () => api.post(`/projects/${project.id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.project(project.id) });
      queryClient.invalidateQueries({ queryKey: qk.projects });
      toast("Back on the press", { description: "Retrying ingestion." });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/projects/${project.id}`),
    onMutate: () => queryClient.cancelQueries({ queryKey: ["project", project.id] }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["project", project.id] });
      queryClient.setQueryData(qk.projects, (old) => old?.filter((p) => p.id !== project.id));
      toast("Repository removed");
      router.replace("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> Repositories
        </Link>

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <StatusPill status={project.status} stage={project.stage} />
              {project.stars != null && (
                <span className="sticker bg-yellow" style={{ "--r": "2deg" }}>
                  <Star className="size-3.5 fill-ink" /> {formatCount(project.stars)}
                </span>
              )}
              {project.primaryLanguage && (
                <span className="sticker bg-blue-soft" style={{ "--r": "-2deg" }}>
                  {project.primaryLanguage}
                </span>
              )}
              {project.defaultBranch && (
                <span className="chip">
                  <GitBranch className="size-3" /> {project.defaultBranch}
                </span>
              )}
            </div>
            <h1 className="truncate font-display text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
              <span className="text-ink-3">{project.repoOwner}/</span>
              {project.repoName}
            </h1>
            {project.description && <p className="mt-2 max-w-2xl text-[16px] text-ink-2">{project.description}</p>}
          </div>
          <div className="flex shrink-0 gap-6 font-mono">
            <div>
              <div className="eyebrow mb-1">Elapsed</div>
              <div className="text-xl font-bold tabular-nums">{duration(elapsed)}</div>
            </div>
            <div>
              <div className="eyebrow mb-1">Files</div>
              <div className="text-xl font-bold tabular-nums">
                {project.fileCount || "—"}
                {project.totalFiles > project.fileCount && <span className="text-ink-4">/{project.totalFiles}</span>}
              </div>
            </div>
          </div>
        </div>

        {failed && (
          <div className="paper offset-pink tape tape-pink mb-8 p-5 sm:p-6" style={{ "--tape-r": "2deg" }}>
            <div className="flex flex-wrap items-start gap-4">
              <span className="stamp text-base animate-stamp" style={{ "--stamp": "var(--color-pink-deep)", "--r": "-8deg" }}>
                Paper jam
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-bold">The press stopped halfway.</h2>
                <p className="mt-1 break-words text-ink-2">{project.errorMessage || "An unknown error interrupted the pipeline."}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" className="btn btn-pink btn-sm" onClick={() => retry.mutate()} disabled={retry.isPending}>
                    {retry.isPending ? <Spinner /> : <RotateCcw className="size-3.5" />} Try again
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove.mutate()} disabled={remove.isPending}>
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <OverallProgress project={project} elapsedMs={elapsed} />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <section className="paper-soft p-5 sm:p-7" aria-label="Pipeline progress">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">The pipeline</h2>
              {project.status === "PENDING" && (
                <span className="font-mono text-[11px] text-ink-3">
                  {project.progress?.retryInMs ? "retrying shortly" : project.progress?.queuePosition > 1 ? `#${project.progress.queuePosition} in queue` : "warming up the press…"}
                </span>
              )}
            </div>
            <ol>
              {STAGES.map((s, i) => (
                <StageRow key={s.id} stage={s} index={i} current={failed ? -2 : current} project={project} />
              ))}
            </ol>
          </section>

          {/* receipt-style print log with a torn bottom edge */}
          <section aria-label="Activity log" className="relative flex min-h-[340px] flex-col">
            <div className="relative flex flex-1 flex-col bg-paper-2 shadow-[0_14px_30px_-18px_rgba(31,28,23,0.4)] [clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),95%_100%,90%_calc(100%-10px),85%_100%,80%_calc(100%-10px),75%_100%,70%_calc(100%-10px),65%_100%,60%_calc(100%-10px),55%_100%,50%_calc(100%-10px),45%_100%,40%_calc(100%-10px),35%_100%,30%_calc(100%-10px),25%_100%,20%_calc(100%-10px),15%_100%,10%_calc(100%-10px),5%_100%,0_calc(100%-10px))]">
              <div className="border-b-2 border-dashed border-ink-4 px-5 pb-3 pt-5 text-center">
                <div className="font-display text-lg font-extrabold tracking-tight">PRINT LOG</div>
                <div className="font-mono text-[11px] text-ink-3">
                  {project.repoOwner}/{project.repoName} · job #{project.id.slice(-6)}
                </div>
              </div>
              <div ref={logRef} className="scroll-thin flex-1 overflow-y-auto px-5 pb-8 pt-4 font-mono text-[12px] leading-6" role="log" aria-live="polite">
                {lines.map((l) => (
                  <div key={l.key} className="flex gap-3 animate-fade-in">
                    <span className="shrink-0 text-ink-4">{l.t.toLocaleTimeString([], { hour12: false })}</span>
                    <span className={cn("min-w-0 break-words", TONES[l.tone] || "text-ink-2")}>{l.text}</span>
                  </div>
                ))}
                {!failed && <div className={cn("caret mt-1 text-ink-4", !running && "opacity-60")} />}
              </div>
            </div>
          </section>
        </div>

        {Array.isArray(project.languages) && project.languages.length > 0 && (
          <div className="paper-soft mt-6 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-bold">What&apos;s on the press</h2>
              <Scissors className="size-4 text-ink-3" />
            </div>
            <LanguageBar languages={project.languages} legend max={6} />
          </div>
        )}

        {project.status === "PROCESSING" && project.stage === "embedding" && (project.progress?.total || 0) > 60 && (
          <p className="hand mt-5 -rotate-1 text-xl text-ink-2">
            psst — embedding is paced to stay inside Gemini&apos;s free quota (~30K tokens/min), so bigger repos take a couple of minutes.
          </p>
        )}

        {stalled && (
          <div className="paper-soft mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink-2">This is taking longer than usual — free-tier APIs may be rate limiting. Keep waiting, or cancel the job.</p>
            <button type="button" className="btn btn-danger btn-sm shrink-0" onClick={() => remove.mutate()} disabled={remove.isPending}>
              <Trash2 className="size-3.5" /> Cancel & delete
            </button>
          </div>
        )}

        <p className="mt-10 flex flex-wrap items-center gap-2 text-sm text-ink-3">
          Feel free to wander off — indexing keeps going and you&apos;ll get a note when it&apos;s ready.
          <a href={project.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue underline-offset-2 hover:underline">
            View on GitHub <ExternalLink className="size-3" />
          </a>
        </p>
      </div>
    </main>
  );
}
