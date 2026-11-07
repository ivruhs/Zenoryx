"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft, SearchX } from "lucide-react";
import { useProject } from "@/components/workspace/hooks";
import { IngestionConsole } from "@/components/workspace/IngestionConsole";
import { Workspace } from "@/components/workspace/Workspace";
import { LogoMark } from "@/components/ui/Logo";

export default function ProjectPage({ params }) {
  const { id } = use(params);
  const { data: project, isPending, error, refetch } = useProject(id);

  if (isPending) {
    return (
      <div className="grid flex-1 place-items-center">
        <LogoMark className="size-8 animate-pulse text-fg-subtle" />
      </div>
    );
  }

  if (error) {
    const missing = error.status === 404;
    return (
      <main className="grid flex-1 place-items-center px-4">
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-5 grid size-12 place-items-center rounded-xl border hairline bg-ink-900">
            <SearchX className="size-5 text-fg-subtle" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">{missing ? "Repository not found" : "Couldn’t load repository"}</h1>
          <p className="mt-2 text-sm text-fg-muted">
            {missing ? "It may have been deleted, or it belongs to another account." : error.message}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {!missing && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => refetch()}>
                Try again
              </button>
            )}
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              <ArrowLeft className="size-3.5" /> Repositories
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return project.status === "READY" ? <Workspace project={project} /> : <IngestionConsole project={project} />;
}
