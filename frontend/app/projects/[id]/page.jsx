// app/projects/[id]/page.js
"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query"; // Added useMutation
import { useRouter } from "next/navigation"; // Added useRouter
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/queryKeys";
import { useProjectStatus } from "@/hooks/useProjectStatus";
import { useQaStream } from "@/hooks/useQaStream";
import { useChatStore } from "@/stores/chatStore";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import {
  FileCode,
  Loader2,
  Send,
  Terminal,
  AlertCircle,
  CheckCircle2,
  GitCommitHorizontal,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function ProjectQAPage({ params }) {
  const unwrappedParams = use(params);
  const projectId = unwrappedParams.id;
  const router = useRouter(); // Initialize router

  // --- 1. DATA FETCHING ---
  const { data: projectDetails } = useQuery({
    queryKey: ["project", projectId, "details"],
    queryFn: () => apiClient.get(`/projects/${projectId}`),
  });

  const { data: commits = [] } = useQuery({
    queryKey: queryKeys.project(projectId).commits,
    queryFn: () => apiClient.get(`/projects/${projectId}/commits`),
  });

  const { data: statusData, isLoading: isStatusLoading } =
    useProjectStatus(projectId);
  const currentStatus = statusData?.status || projectDetails?.status;

  // --- 2. CHAT STATE & STREAMING ---
  const { askQuestion } = useQaStream(projectId);

  const {
    streamingAnswer,
    sourceFiles,
    isStreaming,
    histories,
    addMessageToHistory,
    clearProjectHistory,
  } = useChatStore();

  const [question, setQuestion] = useState("");
  const scrollRef = useRef(null);
  const prevIsStreaming = useRef(isStreaming);

  // NEW: Timeout State for the escape hatch
  const [isTakingTooLong, setIsTakingTooLong] = useState(false);

  const chatHistory = histories[projectId] || [];

  // NEW: 5-Minute Timer Effect
  useEffect(() => {
    let timer;
    if (currentStatus === "PROCESSING" || currentStatus === "PENDING") {
      timer = setTimeout(
        () => {
          setIsTakingTooLong(true);
        },
        5 * 60 * 1000,
      ); // 5 minutes
    }
    return () => clearTimeout(timer);
  }, [currentStatus]);

  // NEW: Delete Mutation for the escape hatch
  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/projects/${projectId}`),
    onSuccess: () => {
      // Clear history and boot them back to the ingest page
      clearProjectHistory(projectId);
      router.push("/projects/new");
    },
  });

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamingAnswer, chatHistory]);

  // When a stream finishes, lock the answer into Zustand
  useEffect(() => {
    if (prevIsStreaming.current === true && isStreaming === false) {
      if (streamingAnswer) {
        addMessageToHistory(projectId, {
          id: Date.now(),
          role: "assistant",
          content: streamingAnswer,
          sources: sourceFiles,
        });
      }
    }
    prevIsStreaming.current = isStreaming;
  }, [
    isStreaming,
    streamingAnswer,
    sourceFiles,
    projectId,
    addMessageToHistory,
  ]);

  // --- 3. HANDLERS ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || isStreaming) return;

    addMessageToHistory(projectId, {
      id: Date.now(),
      role: "user",
      content: question,
    });

    askQuestion(question);
    setQuestion("");
  };

  // --- 4. RENDERERS ---
  if (currentStatus !== "READY") {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-dark-bg text-[#e2e8f0] flex flex-col font-sans">
          <Navbar />
          <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
            {currentStatus === "FAILED" ? (
              <div className="card-3d bg-dark-card border-danger/40 p-8 rounded-2xl max-w-lg w-full shadow-[4px_4px_0px_0px_#ef4444]">
                <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4 animate-bounce" />
                <h2 className="text-xl font-bold text-white mb-2">
                  Ingestion Failed
                </h2>
                <p className="text-danger text-xs font-semibold font-mono mb-6 leading-relaxed">
                  {statusData?.errorMessage ||
                    projectDetails?.errorMessage ||
                    "An unknown error occurred during code analysis."}
                </p>
                <Link
                  href="/projects/new"
                  className="btn-3d btn-3d-danger text-xs px-6 py-2.5 shadow-[2px_2px_0px_0px_#000]"
                >
                  Try Another Repository
                </Link>
              </div>
            ) : (
              <div className="card-3d bg-dark-card border-dark-border p-10 rounded-2xl max-w-lg w-full shadow-[4px_4px_0px_0px_#1e2238]">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
                <h2 className="text-xl font-bold text-white mb-2 select-none">
                  {currentStatus === "PROCESSING"
                    ? "Analyzing Codebase"
                    : "Queued for Ingestion"}
                </h2>

                {/* Real-time progress bar UI */}
                {!isTakingTooLong ? (
                  <div className="space-y-4">
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Zenoryx is currently chunking files and generating vector
                      embeddings. This usually takes 1-3 minutes depending on
                      repository size.
                    </p>
                    {statusData && statusData.fileCount > 0 && (
                      <div className="bg-[#0b0c14] border border-dark-border p-4 rounded-xl space-y-2 text-left shadow-inner">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Indexing Progress</span>
                          <span className="font-mono text-primary">{statusData.processedCount} / {statusData.fileCount} files</span>
                        </div>
                        <div className="w-full bg-dark-card rounded-full h-2 overflow-hidden border border-dark-border">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(100, (statusData.processedCount / statusData.fileCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 p-5 bg-[#ef4444]/10 border border-danger/30 rounded-xl text-left">
                    <h3 className="text-danger font-bold text-sm mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Taking longer than expected
                    </h3>
                    <p className="text-slate-350 text-xs mb-4 leading-relaxed">
                      This repository is either too large or the background
                      worker encountered an unrecoverable error. You can keep
                      waiting, or cancel this process to clean up the database
                      and try another repository.
                    </p>
                    <button
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="w-full btn-3d btn-3d-danger text-xs py-2.5 shadow-[2px_2px_0px_0px_#000]"
                    >
                      {deleteMutation.isPending
                        ? "Cleaning up..."
                        : "Cancel & Clean Up Data"}
                    </button>
                  </div>
                )}

                {projectDetails && (
                  <div className="mt-6 pt-6 border-t border-dark-border/40 text-[10px] font-mono text-slate-500">
                    TARGET: {projectDetails.repoOwner}/{projectDetails.repoName}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-dark-bg text-[#e2e8f0] flex flex-col font-sans relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>

        <Navbar />

        {/* Header Bar */}
        <div className="bg-dark-card border-b border-dark-border py-4 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-slate-500 hover:text-white transition-colors text-lg"
              >
                &larr;
              </Link>
              <div>
                <h1 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                  {projectDetails?.repoName}
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                </h1>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {projectDetails?.repoOwner} • {projectDetails?.fileCount} files indexed
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this repository and all its vector embeddings? This cannot be undone.")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="btn-3d btn-3d-danger text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_#000]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Project</span>
            </button>
          </div>
        </div>

        {/* Workspace body */}
        <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
            
            {/* LEFT PANE: Chat & Commits */}
            <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-0">
              
              {/* Chat Window */}
              <div className="card-3d bg-dark-card border-dark-border shadow-[4px_4px_0px_0px_#1e2238] flex flex-col flex-1 min-h-0 overflow-hidden relative">
                
                {/* Header / Clear Button */}
                {chatHistory.length > 0 && (
                  <div className="absolute top-2.5 right-4 z-10">
                    <button
                      onClick={() => clearProjectHistory(projectId)}
                      title="Clear Chat History"
                      className="p-1.5 text-slate-500 hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pt-12"
                >
                  {chatHistory.length === 0 && !isStreaming ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                      <Terminal className="w-12 h-12 mb-3 text-slate-600 animate-pulse" />
                      <p className="text-xs max-w-sm">
                        Ask a question about the <strong className="text-white font-mono">{projectDetails?.repoName}</strong> codebase files and architecture logic.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Render completed history */}
                      {chatHistory.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                              msg.role === "user"
                                ? "bg-primary/20 border border-primary/30 text-white rounded-br-none shadow-[2px_2px_0px_0px_rgba(139,92,246,0.15)]"
                                : "bg-[#0b0c14] border border-dark-border text-slate-300 rounded-bl-none overflow-x-auto shadow-[2px_2px_0px_0px_rgba(34,38,63,0.2)]"
                            }`}
                          >
                            {msg.role === "user" ? (
                              <div className="whitespace-pre-wrap text-xs leading-relaxed font-sans select-text">
                                {msg.content}
                              </div>
                            ) : (
                              <div className="prose prose-invert prose-xs max-w-none prose-pre:p-0 prose-pre:bg-transparent">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code({
                                      node,
                                      inline,
                                      className,
                                      children,
                                      ...props
                                    }) {
                                      const match = /language-(\w+)/.exec(
                                        className || "",
                                      );
                                      return !inline && match ? (
                                        <SyntaxHighlighter
                                          {...props}
                                          children={String(children).replace(
                                            /\n$/,
                                            "",
                                          )}
                                          style={vscDarkPlus}
                                          language={match[1]}
                                          PreTag="div"
                                          className="rounded-lg my-2 !text-[11px] font-mono border border-dark-border/60"
                                        />
                                      ) : (
                                        <code
                                          {...props}
                                          className="bg-dark-muted border border-dark-border text-slate-300 px-1.5 py-0.5 rounded text-[11px] font-mono"
                                        >
                                          {children}
                                        </code>
                                      );
                                    },
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Render active stream buffer */}
                      {isStreaming && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] bg-[#0b0c14] border border-dark-border text-slate-350 rounded-2xl rounded-bl-none px-5 py-4 overflow-x-auto shadow-[2px_2px_0px_0px_rgba(34,38,63,0.2)]">
                            <div className="prose prose-invert prose-xs max-w-none prose-pre:p-0 prose-pre:bg-transparent">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code({
                                    node,
                                    inline,
                                    className,
                                    children,
                                    ...props
                                  }) {
                                    const match = /language-(\w+)/.exec(
                                      className || "",
                                    );
                                    return !inline && match ? (
                                      <SyntaxHighlighter
                                        {...props}
                                        children={String(children).replace(
                                          /\n$/,
                                          "",
                                        )}
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        className="rounded-lg my-2 !text-[11px] font-mono border border-dark-border/60"
                                      />
                                    ) : (
                                      <code
                                        {...props}
                                        className="bg-dark-muted border border-dark-border text-slate-350 px-1.5 py-0.5 rounded text-[11px] font-mono"
                                      >
                                        {children}
                                      </code>
                                    );
                                  },
                                }}
                              >
                                {streamingAnswer + " ▍"}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 sm:p-5 border-t border-dark-border/40 bg-dark-card z-10">
                  <form onSubmit={handleSubmit} className="relative">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      placeholder="Ask a question (e.g. How is authentication protected?)"
                      className="w-full pl-4 pr-12 py-3 input-3d text-xs font-mono resize-none h-12"
                      rows={1}
                      disabled={isStreaming}
                    />
                    <button
                      type="submit"
                      disabled={!question.trim() || isStreaming}
                      className="absolute right-2 top-2 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-600 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* UX Disclaimer */}
                  <div className="text-center mt-3 select-none">
                    <p className="text-[10px] text-slate-500 font-mono">
                      Sessions are ephemeral. Access logs are cleared when you close the tab.
                    </p>
                  </div>
                </div>
              </div>

              {/* Commit Timeline (Bottom Left) */}
              <div className="card-3d bg-dark-card border-dark-border shadow-[4px_4px_0px_0px_#1e2238] p-4 h-44 overflow-y-auto shrink-0 hidden md:block">
                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider font-mono flex items-center gap-2">
                  <GitCommitHorizontal className="w-4 h-4 text-primary" />
                  <span>Commit Logs (AI Review)</span>
                </h3>
                <div className="space-y-4">
                  {commits.map((commit) => (
                    <div
                      key={commit.sha}
                      className="flex gap-4 border-l-2 border-dark-border pl-4 py-1"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-mono font-bold text-primary select-all">
                            {commit.sha.substring(0, 7)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            • {new Date(commit.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 select-text font-mono">
                          {commit.aiSummary}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          by {commit.authorName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT PANE: Source Files Sidebar */}
            <div className="lg:col-span-1 hidden lg:flex flex-col gap-4 h-full min-h-0 card-3d bg-dark-card border-dark-border shadow-[4px_4px_0px_0px_#1e2238] p-5 overflow-y-auto">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 pb-3 border-b border-dark-border/40 select-none">
                <FileCode className="w-4 h-4 text-secondary" />
                <span>Vector Sources</span>
              </h3>

              {sourceFiles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-[10px] text-slate-500 text-center font-mono leading-relaxed select-none">
                  Discovered vectors and code segments will populate here when you submit queries.
                </div>
              ) : (
                <div className="space-y-3">
                  {sourceFiles.map((file, i) => {
                    const filePath =
                      typeof file === "string" ? file : file.filePath;

                    const githubUrl = projectDetails
                      ? `https://github.com/${projectDetails.repoOwner}/${projectDetails.repoName}/blob/main/${filePath}`
                      : "#";

                    return (
                      <div
                        key={i}
                        className="p-3 bg-[#0b0c14] border border-dark-border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all"
                      >
                        <a
                          href={githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold font-mono text-primary block truncate mb-1 hover:underline select-all"
                          title={`View ${filePath} on GitHub`}
                        >
                          {filePath}
                        </a>
                        {file.summary && (
                          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3 select-text">
                            {file.summary}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
