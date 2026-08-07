// app/projects/new/page.js
"use client";

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
import { FolderGit2, CheckCircle2, ChevronRight, Terminal, AlertTriangle, FileCode } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const [step, setStep] = useState(1); // 1 = URL Input, 2 = Confirmation Preview
  const [validationData, setValidationData] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({
    resolver: zodResolver(repoUrlSchema),
  });

  const ingestMutation = useMutation({
    mutationFn: (data) => apiClient.post("/projects", data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/projects/${data.projectId}`);
    },
    onError: (error) => {
      setServerError(
        error.error ||
          "Failed to ingest repository. Please check the URL and try again.",
      );
    },
  });

  const handleValidate = async (data) => {
    setServerError("");
    setIsValidating(true);
    try {
      const res = await apiClient.post("/projects/validate", data);
      setValidationData(res);
      setStep(2);
    } catch (error) {
      setServerError(
        error.error ||
          "Failed to validate repository. Please check the URL and try again."
      );
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = (data) => {
    handleValidate(data);
  };

  const handleConfirmIngestion = () => {
    setServerError("");
    const url = getValues("repoUrl");
    ingestMutation.mutate({ repoUrl: url });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-dark-bg text-[#e2e8f0] flex flex-col font-sans relative overflow-hidden">
        
        {/* Floating Glowing Blob */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>

        <Navbar />
        <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Back button */}
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1 w-fit group"
            >
              <span>&larr;</span>
              <span className="group-hover:underline">Back to Dashboard</span>
            </Link>
          </div>

          {/* 3D Glass Form Card */}
          <div className="card-3d p-8 sm:p-10 shadow-[6px_6px_0px_0px_#1e2238] bg-dark-card border-dark-border">
            
            {/* Header info */}
            <div className="mb-8 border-b border-dark-border/40 pb-5">
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 select-none">
                <FolderGit2 className="w-6 h-6 text-primary" />
                <span>{step === 1 ? "Ingest Repository" : "Confirm Ingestion"}</span>
              </h1>
              <p className="text-slate-400 mt-2 text-xs leading-relaxed">
                {step === 1 
                  ? "Scan and index a public GitHub repository. Zenoryx will decode and count files to verify limits."
                  : `Reviewing files discovered in the Git tree repository.`
                }
              </p>
            </div>

            {serverError && (
              <div className="mb-6 p-4 bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded-xl flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    GitHub Repository URL
                  </label>
                  <div className="relative">
                    <input
                      {...register("repoUrl")}
                      type="url"
                      className={`w-full px-4 py-3 pl-10 input-3d text-sm font-mono`}
                      placeholder="https://github.com/octocat/Hello-World"
                    />
                    <Terminal className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  </div>
                  {errors.repoUrl && (
                    <p className="text-danger text-xs mt-2 font-mono">
                      {errors.repoUrl.message}
                    </p>
                  )}

                  <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                    * Zenoryx supports public repositories containing a maximum of <strong>15 code files</strong>.
                  </p>
                </div>

                {/* Foot buttons */}
                <div className="pt-6 flex items-center justify-end gap-4 border-t border-dark-border/40">
                  <Link
                    href="/dashboard"
                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isValidating}
                    className="btn-3d btn-3d-primary text-xs px-5 py-2.5 shadow-[2px_2px_0px_0px_#000]"
                  >
                    {isValidating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        <span>Scanning Repo...</span>
                      </>
                    ) : (
                      <>
                        <span>Scan & Validate</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                
                {/* File overview statistics card */}
                <div className="bg-[#0b0c14] p-5 rounded-2xl border border-dark-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Repository Target</span>
                    <h3 className="text-base font-bold text-white font-mono mt-0.5 select-all">
                      {validationData?.repoOwner}/{validationData?.repoName}
                    </h3>
                  </div>
                  <div className="bg-dark-card px-4 py-2.5 rounded-xl border border-dark-border text-center shadow-inner flex-shrink-0">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Code Files</span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-lg font-black text-secondary font-mono">{validationData?.fileCount}</span>
                      <span className="text-[10px] text-slate-500">/ 15 max</span>
                    </div>
                  </div>
                </div>

                {/* File list scrollbox */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-primary" />
                    <span>Discovered Source Files</span>
                  </h4>
                  <div className="border border-dark-border rounded-xl overflow-hidden shadow-inner bg-[#07080d]">
                    <div className="max-h-60 overflow-y-auto divide-y divide-dark-border/40 font-mono text-[11px] text-slate-400">
                      {validationData?.files.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-dark-card/40 transition-colors">
                          <span className="truncate pr-4 select-all" title={file.path}>{file.path}</span>
                          <span className="text-slate-500 flex-shrink-0">{formatSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status banner */}
                <div className="p-4 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-medium rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-secondary" />
                  <span>Validation successful. The repository is compatible for AI vector indexing.</span>
                </div>

                {/* Foot buttons */}
                <div className="pt-6 flex items-center justify-between gap-4 border-t border-dark-border/40">
                  <button
                    onClick={() => setStep(1)}
                    disabled={ingestMutation.isPending}
                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    &larr; Change Repo URL
                  </button>
                  <div className="flex gap-3">
                    <Link
                      href="/dashboard"
                      className="btn-3d btn-3d-slate text-xs px-4 py-2.5 shadow-[2px_2px_0px_0px_#000]"
                    >
                      Cancel
                    </Link>
                    <button
                      onClick={handleConfirmIngestion}
                      disabled={ingestMutation.isPending}
                      className="btn-3d btn-3d-primary text-xs px-5 py-2.5 shadow-[2px_2px_0px_0px_#000]"
                    >
                      {ingestMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                          <span>Ingesting...</span>
                        </>
                      ) : (
                        "Confirm & Index"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
