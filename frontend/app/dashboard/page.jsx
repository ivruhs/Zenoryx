// app/dashboard/page.js

/**
 * 
/dashboard
      │
      ▼
AuthGuard checks login
      │
      ▼
Navbar renders
      │
      ▼
Get user from Zustand
      │
      ▼
React Query calls GET /projects
      │
      ▼
Backend returns repositories
      │
      ▼
Repository cards render
      │
      ▼
User clicks repository
      │
      ▼
/projects/:id
      │
      ▼
Future ChatGPT-style code Q&A page
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";

// Helper component for the status badge colors
const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: "bg-slate-100 text-slate-600 border-slate-200",
    PROCESSING: "bg-pastel-amber/30 text-amber-800 border-pastel-amber",
    READY: "bg-pastel-green/30 text-green-800 border-pastel-green",
    FAILED: "bg-pastel-red/30 text-red-800 border-pastel-red",
  };

  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const { data: projects = [], isLoading } = useQuery({
    // We pass the userId to the query key factory so caches don't cross between users
    queryKey: queryKeys.projects.list(user?.id),
    queryFn: () => apiClient.get("/projects"),
    enabled: !!user?.id, // Only run the query if we have an ID
  });

  if (isLoading) {
    return (
      <div className="text-slate-500 animate-pulse">
        Loading your repositories...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Your Repositories
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and query your ingested codebases.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          + Ingest New Repository
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            No repositories yet
          </h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            You haven't ingested any GitHub repositories. Add your first
            repository to start chatting with your code.
          </p>
          <Link
            href="/projects/new"
            className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
          >
            Add a repository &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full flex flex-col group">
                <div className="flex justify-between items-start mb-3">
                  <StatusBadge status={project.status} />
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                  {project.repoName}
                </h3>
                <p className="text-sm text-slate-500 truncate mb-4">
                  {project.repoOwner}
                </p>

                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded">
                    {project.fileCount} files
                  </span>
                  {project.status === "FAILED" && (
                    <span className="text-red-500">Processing Failed</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
