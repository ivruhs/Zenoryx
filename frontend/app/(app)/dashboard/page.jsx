"use client";

import Link from "next/link";
import { AlertTriangle, Plus, RotateCw } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { RepoCard, RepoCardSkeleton } from "@/components/dashboard/RepoCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatCount } from "@/lib/format";
import { isActive } from "@/lib/pipeline";

function Summary({ projects }) {
  const chunks = projects.reduce((n, p) => n + (p.chunkCount || 0), 0);
  const files = projects.reduce((n, p) => n + (p.status === "READY" ? p.fileCount || 0 : 0), 0);
  const indexing = projects.filter((p) => isActive(p.status)).length;
  const parts = [
    `${projects.length} ${projects.length === 1 ? "repository" : "repositories"}`,
    `${formatCount(chunks)} chunks indexed`,
    `${formatCount(files)} files`,
  ];
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 font-mono text-xs text-fg-subtle">
      {parts.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && <span className="text-fg-faint">·</span>}
          {p}
        </span>
      ))}
      {indexing > 0 && (
        <span className="flex items-center gap-2 text-amber">
          <span className="text-fg-faint">·</span>
          <span className="size-1.5 animate-pulse-dot rounded-full bg-amber" />
          {indexing} indexing
        </span>
      )}
    </p>
  );
}

export default function DashboardPage() {
  const { data: projects, isPending, isError, error, refetch, isRefetching } = useProjects();
  const hasProjects = projects && projects.length > 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-[28px]">Repositories</h1>
          {hasProjects ? (
            <Summary projects={projects} />
          ) : (
            <p className="mt-1.5 text-sm text-fg-subtle">Every repository you index lives here.</p>
          )}
        </div>
        {hasProjects && (
          <Link href="/projects/new" className="btn btn-primary self-start sm:self-auto">
            <Plus className="size-4" /> Index repository
          </Link>
        )}
      </div>

      <div className="mt-8">
        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading repositories">
            {Array.from({ length: 6 }, (_, i) => (
              <RepoCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div role="alert" className="panel flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-coral/25 bg-coral/10 text-coral">
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Couldn&apos;t load your repositories</div>
              <div className="mt-0.5 text-sm text-fg-muted">{error?.message || "Something went wrong."}</div>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => refetch()} disabled={isRefetching}>
              <RotateCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Try again
            </button>
          </div>
        ) : !hasProjects ? (
          <EmptyState />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id} className="animate-fade-up">
                <RepoCard project={p} />
              </li>
            ))}
            <li>
              <Link
                href="/projects/new"
                className="group flex h-full min-h-[212px] flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-white/10 text-fg-subtle transition-colors hover:border-signal/40 hover:text-fg"
              >
                <span className="grid size-10 place-items-center rounded-full border hairline-strong bg-ink-900 transition-colors group-hover:border-signal/40 group-hover:text-signal">
                  <Plus className="size-4" />
                </span>
                <span className="text-sm">Index another repository</span>
              </Link>
            </li>
          </ul>
        )}
      </div>
    </main>
  );
}
