"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, MoreHorizontal, RotateCw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LanguageBar } from "@/components/ui/LanguageBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "./ConfirmDialog";
import { StageTrack } from "./StageTrack";
import { api, qk } from "@/lib/api";
import { cn, formatCount, timeAgo } from "@/lib/format";
import { isActive } from "@/lib/pipeline";

const stop = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

function CardMenu({ project, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={cn("icon-btn size-7", open && "bg-ink-800 text-fg")}
        aria-label={`Actions for ${project.repoName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          stop(e);
          setOpen((o) => !o);
        }}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div role="menu" className="panel-raised absolute right-0 top-9 z-30 w-48 animate-fade-in p-1" onClick={stop}>
          <a
            role="menuitem"
            href={`https://github.com/${project.repoOwner}/${project.repoName}`}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-fg-muted hover:bg-ink-800 hover:text-fg"
          >
            <ExternalLink className="size-3.5" /> Open on GitHub
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={(e) => {
              stop(e);
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-coral/90 hover:bg-coral/10 hover:text-coral"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ children, title }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={title}>
      {children}
    </span>
  );
}

export function RepoCard({ project }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const active = isActive(project.status);
  const failed = project.status === "FAILED";

  const retry = useMutation({
    mutationFn: () => api.post(`/projects/${project.id}/retry`),
    onSuccess: () => {
      toast("Retrying ingestion", { description: `${project.repoOwner}/${project.repoName}` });
      queryClient.invalidateQueries({ queryKey: qk.projects });
    },
    onError: (err) => toast.error("Couldn't retry", { description: err.message }),
  });

  const remove = useMutation({
    mutationFn: () => api.del(`/projects/${project.id}`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: qk.projects });
      const previous = queryClient.getQueryData(qk.projects);
      queryClient.setQueryData(qk.projects, (old = []) => old.filter((p) => p.id !== project.id));
      setConfirming(false);
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(qk.projects, ctx.previous);
      toast.error("Couldn't delete repository", { description: err.message });
    },
    onSuccess: () => toast.success(`Deleted ${project.repoOwner}/${project.repoName}`, { description: "Vectors, commits and chat history removed." }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.projects }),
  });

  return (
    <>
      <div
        className={cn(
          "group relative flex h-full min-h-[212px] flex-col rounded-[14px] border hairline bg-ink-900 p-5 transition-[border-color,background-color] duration-200",
          "hover:border-white/15 hover:bg-ink-850 has-[:focus-visible]:border-signal/50",
          failed && "border-coral/20",
        )}
      >
        {/* Stretched link: the whole card navigates, while menus/buttons sit above it. */}
        <Link
          href={`/projects/${project.id}`}
          data-card-link
          className="absolute inset-0 z-0 rounded-[14px] focus-visible:outline-none"
          aria-label={`Open ${project.repoOwner}/${project.repoName}`}
        />
        {/* Header */}
        <div className="pointer-events-none flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-mono text-xs text-fg-subtle">{project.repoOwner}/</div>
            <h3 className="mt-0.5 truncate text-[17px] font-semibold tracking-[-0.02em] text-fg transition-colors group-hover:text-white">
              {project.repoName}
            </h3>
          </div>
          <div className="pointer-events-auto relative z-10 -mr-1.5 -mt-1 flex shrink-0 items-center gap-1">
            <StatusPill status={project.status} stage={project.stage} />
            <CardMenu project={project} onDelete={() => setConfirming(true)} />
          </div>
        </div>

        {/* Body */}
        <p className={cn("pointer-events-none mt-3 line-clamp-2 text-sm leading-relaxed", project.description ? "text-fg-muted" : "italic text-fg-faint")}>
          {project.description || "No description provided."}
        </p>

        <div className="pointer-events-none mt-auto pt-5">
          {active ? (
            <StageTrack project={project} />
          ) : failed ? (
            <div className="flex items-center gap-3">
              <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-coral/90" title={project.errorMessage || ""}>
                <AlertCircle className="size-3.5 shrink-0" />
                <span className="truncate">{project.errorMessage || "Ingestion failed."}</span>
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm pointer-events-auto relative z-10 shrink-0"
                disabled={retry.isPending}
                onClick={(e) => {
                  stop(e);
                  retry.mutate();
                }}
              >
                {retry.isPending ? <Spinner className="size-3.5" /> : <RotateCw className="size-3.5" />}
                Retry
              </button>
            </div>
          ) : (
            <LanguageBar languages={project.languages} />
          )}

          {/* Footer stats */}
          <div className="mt-4 flex items-center gap-x-4 gap-y-1 border-t hairline pt-3.5 font-mono text-[11px] text-fg-subtle">
            <Stat title="Files indexed">
              <span className="text-fg-muted tabular-nums">{project.fileCount}</span> files
            </Stat>
            <Stat title="Semantic chunks">
              <span className="text-fg-muted tabular-nums">{formatCount(project.chunkCount)}</span> chunks
            </Stat>
            {project.stars != null && (
              <Stat title="GitHub stars">
                <Star className="size-3" /> <span className="tabular-nums">{formatCount(project.stars)}</span>
              </Stat>
            )}
            <span className="ml-auto truncate" title={new Date(project.createdAt).toLocaleString()}>
              {timeAgo(project.completedAt || project.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        destructive
        busy={remove.isPending}
        title={`Delete ${project.repoOwner}/${project.repoName}?`}
        description="This permanently removes its vector index, commit summaries and chat history. The GitHub repository is not affected."
        confirmLabel="Delete repository"
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

export function RepoCardSkeleton() {
  return (
    <div className="flex min-h-[212px] flex-col rounded-[14px] border hairline bg-ink-900 p-5">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton mt-2 h-5 w-40" />
      <div className="skeleton mt-4 h-3 w-full" />
      <div className="skeleton mt-2 h-3 w-2/3" />
      <div className="mt-auto">
        <div className="skeleton h-1.5 w-full" />
        <div className="mt-4 flex gap-4 border-t hairline pt-3.5">
          <div className="skeleton h-3 w-14" />
          <div className="skeleton h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
