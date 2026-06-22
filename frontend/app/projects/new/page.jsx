// app/projects/new/page.js
"use client";

/**
 * This is our create project/start ingestion page
User pastes GitHub URL
        ↓
Frontend validates URL
        ↓
POST /projects
        ↓
Backend creates project
        ↓
Worker starts ingestion
        ↓
Redirect to project page
        ↓
User watches progress
 * 
This page is the entry point into the entire Zenoryx pipeline—it validates a GitHub repository URL, creates a project through the backend, triggers AI ingestion, refreshes cached project data, and redirects the user to the project page where ingestion progress can be monitored. 🚀
 *
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { repoUrlSchema } from "@/lib/schemas";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/Navbar";

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  // form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(repoUrlSchema),
  });

  // This is the heart. note we are using useMutation isntead of useQuery since this is a create operation.
  const ingestMutation = useMutation({
    mutationFn: (data) => apiClient.post("/projects", data),
    onSuccess: (data) => {
      // Clear the dashboard cache so the new project appears when they go back
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      // Redirect instantly to the new project's specific chat page
      router.push(`/projects/${data.projectId}`);
    },
    onError: (error) => {
      // This will catch the 25-file limit error from the backend
      setServerError(
        error.error ||
          "Failed to ingest repository. Please check the URL and try again.",
      );
    },
  });

  const onSubmit = (data) => {
    setServerError("");
    ingestMutation.mutate(data);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 hover:text-primary transition-colors"
            >
              &larr; Back to Dashboard
            </Link>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Ingest Repository
              </h1>
              <p className="text-slate-500 mt-2">
                Paste a public GitHub repository URL below. Zenoryx will
                download, chunk, and analyze the codebase using AI.
              </p>
            </div>

            {serverError && (
              <div className="mb-6 p-4 bg-pastel-red/20 border border-pastel-red text-red-800 text-sm rounded-xl">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  GitHub Repository URL
                </label>
                <div className="relative">
                  <input
                    {...register("repoUrl")}
                    type="url"
                    className={`w-full px-4 py-3 pl-10 border ${errors.repoUrl ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:ring-primary focus:border-primary"} rounded-xl focus:ring-2 outline-none transition-all font-mono text-sm`}
                    placeholder="https://github.com/octocat/Hello-World"
                  />
                  <svg
                    className="w-5 h-5 absolute left-3 top-3.5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                {errors.repoUrl && (
                  <p className="text-red-500 text-sm mt-2">
                    {errors.repoUrl.message}
                  </p>
                )}

                <p className="text-xs text-slate-500 mt-3">
                  <strong>Note:</strong> For this V1 version, the repository
                  must be public, and only the first 25 code files will be
                  processed.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-100">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={ingestMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-6 rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {ingestMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Initializing...</span>
                    </>
                  ) : (
                    "Ingest Repository"
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

/**
 * Complete flow:
 * 
User opens page
        ↓
AuthGuard verifies login
        ↓
User pastes GitHub URL
        ↓
React Hook Form validates
        ↓
Zod validates URL format
        ↓
POST /projects
        ↓
Backend creates project
        ↓
BullMQ job queued
        ↓
Worker starts ingestion
        ↓
Frontend redirects
        ↓
/projects/:projectId
        ↓
Status polling begins
        ↓
READY ✅
 */
