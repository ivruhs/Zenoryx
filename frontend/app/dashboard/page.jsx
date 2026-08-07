// app/dashboard/page.js
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, FolderPlus, FolderGit2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";

// Helper component for the status badge colors
const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    PROCESSING: "bg-primary/10 text-primary border-primary/30 shadow-[0_0_8px_rgba(139,92,246,0.15)] animate-pulse",
    READY: "bg-secondary/10 text-secondary border-secondary/30 shadow-[0_0_8px_rgba(20,184,166,0.15)]",
    FAILED: "bg-danger/10 text-danger border-danger/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]",
  };

  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-mono flex items-center gap-1.5 ${styles[status]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(user?.id) });
    },
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: queryKeys.projects.list(user?.id),
    queryFn: () => apiClient.get("/projects"),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-primary font-mono text-sm gap-3">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span>Decrypting repository lists...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans text-slate-300">
      
      {/* Page Header */}
      <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4 border-b border-dark-border/40 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-primary" />
            <span>Your Codebases</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyze, query, and chat with your ingested GitHub repositories.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="btn-3d btn-3d-primary text-xs px-4 py-2.5 flex items-center gap-2 shadow-[2px_2px_0px_0px_#000]"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Ingest New Repository</span>
        </Link>
      </div>

      {/* Repository Listing */}
      {projects.length === 0 ? (
        <div className="card-3d bg-dark-card border-dark-border p-12 text-center shadow-[4px_4px_0px_0px_#1e2238] max-w-xl mx-auto mt-8">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-bold text-white mb-2">
            No repositories ingested yet
          </h3>
          <p className="text-slate-400 text-xs mb-8 max-w-md mx-auto leading-relaxed">
            Index a public GitHub repository with 15 or fewer files to start chatting with your codebase in plain English.
          </p>
          <Link
            href="/projects/new"
            className="btn-3d btn-3d-primary text-xs px-6 py-2.5"
          >
            Add your first repository &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block h-full">
              <div className="card-3d p-5 shadow-[4px_4px_0px_0px_#1e2238] hover:shadow-[6px_6px_0px_0px_#8b5cf6] bg-dark-card border-dark-border flex flex-col justify-between h-full group transition-all">
                
                {/* Badge and date */}
                <div className="flex justify-between items-center mb-4">
                  <StatusBadge status={project.status} />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(project.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete the repository "${project.repoOwner}/${project.repoName}" and all its vector chunks?`)) {
                          deleteMutation.mutate(project.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-slate-500 hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div className="mb-6">
                  <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors truncate font-mono">
                    {project.repoName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {project.repoOwner}
                  </p>
                </div>

                {/* Footer specs */}
                <div className="pt-4 border-t border-dark-border/40 flex justify-between items-center text-xs">
                  <span className="font-mono bg-dark-bg border border-dark-border px-2.5 py-1 rounded-lg text-slate-400">
                    {project.fileCount} files
                  </span>
                  
                  {project.status === "FAILED" && (
                    <span className="text-danger flex items-center gap-1 font-mono text-[10px]">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Failed
                    </span>
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
