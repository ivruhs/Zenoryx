"use client";
import useProject from "../../../hooks/use-project";
import { api } from "../../../trpc/react";
import { cn } from "../../../lib/utils";
import Link from "next/link";
import { ExternalLink, GitCommit, Calendar, User } from "lucide-react";

const CommitLog = () => {
  const { projectId, project } = useProject();
  const { data: commits } = api.project.getCommits.useQuery({ projectId });

  if (!commits || commits.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800">
        <GitCommit className="mx-auto mb-4 h-12 w-12 text-slate-400" />
        <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          No commits yet
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Commits will appear here once you start pushing to your repository.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-2">
          <GitCommit className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Recent Commits
        </h2>
      </div>

      <div className="space-y-4">
        {commits?.map((commit, commitIdx) => {
          return (
            <div key={commit.id} className="relative">
              {/* Timeline line */}
              <div
                className={cn(
                  "absolute top-14 left-6 w-px bg-gradient-to-b from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700",
                  commitIdx === commits.length - 1 ? "h-0" : "h-full",
                )}
              />

              <div className="flex gap-4">
                {/* Avatar with timeline dot */}
                <div className="relative flex-shrink-0">
                  <img
                    src={commit.commitAuthorAvatar || "/placeholder.svg"}
                    alt="commit avatar"
                    className="h-12 w-12 rounded-full border-2 border-white bg-slate-100 shadow-lg dark:border-slate-800 dark:bg-slate-700"
                  />
                </div>

                {/* Commit content */}
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <User className="h-4 w-4 flex-shrink-0 text-slate-500" />
                        <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                          {commit.commitAuthorName}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          committed
                        </span>
                      </div>

                      <Link
                        target="_blank"
                        href={`${project?.githubUrl}/commits/${commit.commitHash}`}
                        className="flex flex-shrink-0 items-center gap-1 text-sm text-blue-600 transition-colors duration-200 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Calendar className="h-4 w-4" />
                        View on GitHub
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <h3 className="mb-3 leading-relaxed font-semibold text-slate-900 dark:text-slate-100">
                      {commit.commitMessage}
                    </h3>

                    {commit.summary && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700">
                        <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          Summary
                        </h4>
                        <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                          {commit.summary}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommitLog;
