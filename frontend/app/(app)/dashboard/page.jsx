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
  const stats = [
    { value: projects.length, label: projects.length === 1 ? "repository" : "repositories", ink: "var(--color-yellow)" },
    { value: formatCount(chunks), label: "chunks cut", ink: "var(--color-pink-soft)" },
    { value: formatCount(files), label: "files read", ink: "var(--color-blue-soft)" },
  ];
  return (
    <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      {stats.map((s) => (
        <div key={s.label} className="flex items-baseline gap-1.5">
          <dt className="sr-only">{s.label}</dt>
          <dd className="marker font-mono text-[15px] font-bold tabular-nums text-ink" style={{ "--mk": s.ink }}>
            {s.value}
          </dd>
          <span className="text-sm text-ink-3">{s.label}</span>
        </div>
      ))}
      {indexing > 0 && (
        <span className="sticker bg-orange-soft text-xs" style={{ "--r": "2deg" }}>
          <span className="size-1.5 animate-pulse-dot rounded-full bg-orange" />
          {indexing} on the press
        </span>
      )}
    </dl>
  );
}

export default function DashboardPage() {
  const { data: projects, isPending, isError, error, refetch, isRefetching } = useProjects();
  const hasProjects = projects && projects.length > 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="eyebrow">Your archive</span>
          <h1
            className="mt-2 text-[2.6rem] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-6xl"
            style={{ fontVariationSettings: '"wdth" 82' }}
          >
            Repositories
          </h1>
          {hasProjects ? (
            <Summary projects={projects} />
          ) : (
            <p className="mt-3 text-[15px] text-ink-2">Every repository you cut up and index lives here.</p>
          )}
        </div>
        {hasProjects && (
          <Link href="/projects/new" className="btn btn-primary self-start sm:self-auto">
            <Plus className="size-4" strokeWidth={2.5} /> Index repository
          </Link>
        )}
      </div>

      <div className="mt-10">
        {isPending ? (
          <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading repositories">
            {Array.from({ length: 6 }, (_, i) => (
              <RepoCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div role="alert" className="paper offset-pink flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-pink-soft text-pink-deep">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-bold tracking-tight">The press jammed loading your repositories</div>
              <div className="mt-0.5 text-sm text-ink-2">{error?.message || "Something went wrong."}</div>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => refetch()} disabled={isRefetching}>
              <RotateCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Try again
            </button>
          </div>
        ) : !hasProjects ? (
          <EmptyState />
        ) : (
          <ul className="grid gap-x-6 gap-y-9 pt-2 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p, i) => (
              <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                <RepoCard project={p} index={i} />
              </li>
            ))}
            <li>
              <Link
                href="/projects/new"
                className="group flex h-full min-h-[236px] flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed border-ink/25 text-ink-3 transition-colors hover:border-ink hover:bg-paper-2/60 hover:text-ink"
              >
                <span className="grid size-12 place-items-center rounded-full border-[1.5px] border-ink bg-yellow text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-transform duration-300 group-hover:rotate-90">
                  <Plus className="size-5" strokeWidth={2.5} />
                </span>
                <span className="font-display text-base font-bold">Index another repository</span>
                <span className="hand -mt-1 text-lg text-ink-3">more to cut up?</span>
              </Link>
            </li>
          </ul>
        )}
      </div>
    </main>
  );
}
