// app/projects/[id]/page.js
"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const chatHistory = histories[projectId] || [];

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
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <Navbar />
          <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
            {currentStatus === "FAILED" ? (
              <div className="bg-red-50 border border-red-200 p-8 rounded-2xl max-w-lg w-full shadow-sm">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-900 mb-2">
                  Ingestion Failed
                </h2>
                <p className="text-red-700 text-sm mb-6">
                  {statusData?.errorMessage ||
                    projectDetails?.errorMessage ||
                    "An unknown error occurred during code analysis."}
                </p>
                <Link
                  href="/projects/new"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Try Another Repository
                </Link>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-10 rounded-2xl max-w-lg w-full shadow-sm">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  {currentStatus === "PROCESSING"
                    ? "Analyzing Codebase"
                    : "Queued for Ingestion"}
                </h2>
                <p className="text-slate-500 text-sm">
                  Zenoryx is currently chunking files and generating vector
                  embeddings. This usually takes 1-3 minutes depending on
                  repository size.
                </p>
                {projectDetails && (
                  <div className="mt-6 pt-6 border-t border-slate-100 text-xs font-mono text-slate-400">
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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        {/* Header Bar */}
        <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-slate-400 hover:text-primary transition-colors"
              >
                &larr;
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {projectDetails?.repoName}
                  <CheckCircle2 className="w-4 h-4 text-pastel-green" />
                </h1>
                <p className="text-xs text-slate-500">
                  {projectDetails?.repoOwner} • {projectDetails?.fileCount}{" "}
                  files indexed
                </p>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
            {/* LEFT PANE: Chat & Commits */}
            <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-0">
              {/* Chat Window */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden relative">
                {/* Header / Clear Button */}
                {chatHistory.length > 0 && (
                  <div className="absolute top-2 right-4 z-10">
                    <button
                      onClick={() => clearProjectHistory(projectId)}
                      title="Clear Chat History"
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                      <Terminal className="w-12 h-12 mb-3 text-slate-300" />
                      <p>
                        Ask a question about the{" "}
                        <strong>{projectDetails?.repoName}</strong>{" "}
                        architecture.
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
                                ? "bg-pastel-blue text-slate-900 rounded-br-none"
                                : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none overflow-x-auto"
                            }`}
                          >
                            {msg.role === "user" ? (
                              <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                                {msg.content}
                              </div>
                            ) : (
                              <div className="prose prose-sm max-w-none prose-pre:p-0 prose-pre:bg-transparent">
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
                                          className="rounded-lg my-2 !text-xs"
                                        />
                                      ) : (
                                        <code
                                          {...props}
                                          className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono"
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
                          <div className="max-w-[85%] bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl rounded-bl-none px-5 py-4 overflow-x-auto">
                            <div className="prose prose-sm max-w-none prose-pre:p-0 prose-pre:bg-transparent">
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
                                        className="rounded-lg my-2 !text-xs"
                                      />
                                    ) : (
                                      <code
                                        {...props}
                                        className="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono"
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
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-white">
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
                      placeholder="e.g. How is the database connection established?"
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none text-sm transition-all"
                      rows={1}
                      disabled={isStreaming}
                    />
                    <button
                      type="submit"
                      disabled={!question.trim() || isStreaming}
                      className="absolute right-2 top-2 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:bg-slate-300 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  {/* UX Disclaimer */}
                  <div className="text-center mt-3">
                    <p className="text-[11px] text-slate-400 font-medium">
                      Zenoryx does not store chat history in the database.
                      Messages are saved for your current session only and will
                      be cleared when you close the tab.
                    </p>
                  </div>
                </div>
              </div>

              {/* Commit Timeline (Bottom Left) */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 h-40 overflow-y-auto shrink-0 hidden md:block">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <GitCommitHorizontal className="w-4 h-4 text-pastel-purple" />
                  Recent Commits (AI Summarized)
                </h3>
                <div className="space-y-4">
                  {commits.map((commit) => (
                    <div
                      key={commit.sha}
                      className="flex gap-4 border-l-2 border-slate-100 pl-4 py-1"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {commit.sha.substring(0, 7)}
                          </span>
                          <span className="text-xs text-slate-400">
                            • {new Date(commit.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 line-clamp-2">
                          {commit.aiSummary}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          by {commit.authorName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT PANE: Source Files Sidebar */}
            <div className="lg:col-span-1 hidden lg:flex flex-col gap-4 h-full min-h-0 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileCode className="w-4 h-4 text-pastel-blue" />
                Retrieved Context
              </h3>

              {sourceFiles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-400 text-center">
                  When you ask a question, the relevant files retrieved by the
                  vector database will appear here.
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
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-pastel-blue hover:shadow-sm transition-all"
                      >
                        <a
                          href={githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-primary block truncate mb-1 hover:underline"
                          title={`View ${filePath} on GitHub`}
                        >
                          {filePath}
                        </a>
                        {file.summary && (
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
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
