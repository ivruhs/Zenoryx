"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, GitBranch, Info, ScanLine, Star } from "lucide-react";
import { toast } from "sonner";
import { FileTree } from "@/components/ingest/FileTree";
import { LanguageBar } from "@/components/ui/LanguageBar";
import { Spinner } from "@/components/ui/Spinner";
import { api, qk } from "@/lib/api";
import { cn, formatCount } from "@/lib/format";
import { STAGES } from "@/lib/pipeline";

/* ---------------------------------------------------------------------------- */
function describeError(err) {
  if (!err) return null;
  switch (err.code) {
    case "INVALID_URL":
      return { title: "That doesn't look like a GitHub repository", body: "Use a URL like https://github.com/owner/repo, or just owner/repo." };
    case "REPO_NOT_FOUND":
      return { title: "Repository not found", body: "Check the spelling. Private repositories can't be indexed — only public ones." };
    case "GITHUB_RATE_LIMIT":
      return { title: "GitHub rate limit reached", body: `${err.message} The limit resets every hour.` };
    case "NO_CODE":
      return { title: "No supported source files", body: "This repository has no files in a language Zenoryx can index." };
    case "REPO_EMPTY":
      return { title: "Repository is empty", body: "There's nothing to index yet." };
    case "REPO_PRIVATE":
      return { title: "Private repository", body: "Only public repositories can be indexed." };
    default:
      if (err.status === 0) return { title: "Can't reach the Zenoryx API", body: "Make sure the backend is running, then try again." };
      return { title: "Something went wrong", body: err.message };
  }
}

/** Normalise "https://github.com/a/b", "github.com/a/b", "git@github.com:a/b.git" → "a/b" for display. */
function toSlug(input) {
  return input
    .trim()
    .replace(/^git@github\.com:/i, "")
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
}

function ErrorNotice({ error }) {
  const e = describeError(error);
  if (!e) return null;
  return (
    <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-coral/25 bg-coral/[0.06] p-4 animate-fade-in">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral" />
      <div className="min-w-0 text-sm">
        <div className="font-medium text-coral">{e.title}</div>
        <div className="mt-0.5 text-fg-muted">{e.body}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- */
function ScanningState({ slug }) {
  const rows = [72, 46, 58, 38, 64, 52, 30, 60];
  return (
    <div className="panel relative mt-8 overflow-hidden p-5 animate-fade-in" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <Spinner className="text-signal" />
        <div className="min-w-0 text-sm">
          <span className="text-fg">Scanning</span> <span className="font-mono text-fg-muted">{slug}</span>
          <div className="mt-0.5 font-mono text-[11px] text-fg-subtle">Reading the git tree · ranking files by architectural relevance</div>
        </div>
      </div>
      <div className="relative mt-5 space-y-2.5 overflow-hidden rounded-lg border hairline bg-ink-950 p-4">
        {rows.map((w, i) => (
          <div key={i} className="flex items-center gap-2.5" style={{ paddingLeft: (i % 3) * 14 }}>
            <span className="size-2 shrink-0 rounded-full bg-ink-700" />
            <span className="skeleton h-2.5" style={{ width: `${w}%` }} />
          </div>
        ))}
        {/* Full-height track so translateY(%) sweeps the whole tree. */}
        <div className="pointer-events-none absolute inset-0" style={{ animation: "scan 1.8s linear infinite" }} aria-hidden="true">
          <div className="h-14 bg-gradient-to-b from-transparent to-signal/15" />
          <div className="h-px bg-signal/70 shadow-[0_0_12px_var(--color-signal)]" />
        </div>
      </div>
    </div>
  );
}

function NextSteps() {
  return (
    <section className="mt-12" aria-labelledby="next-steps">
      <h2 id="next-steps" className="eyebrow">
        What happens next
      </h2>
      <ol className="mt-4 grid gap-px overflow-hidden rounded-xl border hairline bg-[var(--line)] sm:grid-cols-5">
        {STAGES.map((s, i) => (
          <li key={s.id} className="bg-ink-950 p-4">
            <div className="font-mono text-[11px] text-fg-faint">0{i + 1}</div>
            <div className="mt-1.5 text-sm font-medium">{s.label}</div>
            <p className="mt-1 text-xs leading-relaxed text-fg-subtle">{s.verb}</p>
            <div className="mt-2 font-mono text-[10.5px] text-fg-faint">{s.hint}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------------------- */
function StatCell({ label, value, sub }) {
  return (
    <div className="bg-ink-900 px-4 py-3.5">
      <div className="eyebrow !text-[10px]">{label}</div>
      <div className="mt-1.5 font-mono text-xl tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-fg-subtle">{sub}</div>}
    </div>
  );
}

function ScanReport({ report, onBack, onStart, starting, error }) {
  const { repo } = report;
  const skipped = report.totalFiles - report.selectedCount;
  return (
    <div className="mt-8 animate-fade-up">
      <div className="panel overflow-hidden">
        {/* Repo header */}
        <div className="border-b hairline p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="eyebrow !text-[10px] text-signal">Scan complete</div>
              <h2 className="mt-2 break-words font-mono text-lg tracking-tight sm:text-xl">
                <span className="text-fg-subtle">{repo.owner}/</span>
                <span className="font-semibold text-fg">{repo.repo}</span>
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {repo.stars != null && (
                <span className="chip">
                  <Star className="size-3" /> {formatCount(repo.stars)}
                </span>
              )}
              <span className="chip">
                <GitBranch className="size-3" /> {repo.defaultBranch}
              </span>
              {repo.primaryLanguage && <span className="chip">{repo.primaryLanguage}</span>}
            </div>
          </div>
          {repo.description && <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-fg-muted">{repo.description}</p>}
          <LanguageBar languages={report.languages} legend max={6} className="mt-5" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-px border-b hairline bg-[var(--line)] sm:grid-cols-3">
          <StatCell label="Supported files" value={report.totalFiles} sub="Source & docs in the tree" />
          <StatCell
            label="Will index"
            value={
              <>
                {report.selectedCount}
                <span className="text-fg-faint"> / {report.totalFiles}</span>
              </>
            }
            sub={skipped > 0 ? "Ranked by architectural relevance" : "Every supported file"}
          />
          <StatCell label="Per-repo limit" value={report.maxFiles} sub="Free-tier friendly" />
        </div>

        <div className="p-5 sm:p-6">
          {report.existingProjectId && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-signal/25 bg-signal/[0.05] p-3.5 text-sm">
              <Info className="size-4 shrink-0 text-signal" />
              <span className="min-w-0 flex-1 text-fg-muted">You&apos;ve already indexed this repository.</span>
              <Link href={`/projects/${report.existingProjectId}`} className="btn btn-secondary btn-sm">
                Open existing <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
          {report.truncated && (
            <p className="mb-4 flex items-center gap-2 text-xs text-amber">
              <Info className="size-3.5" /> GitHub truncated this tree (very large repository) — some files aren&apos;t listed.
            </p>
          )}
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium">Files</h3>
            {skipped > 0 && (
              <span className="text-right text-xs text-fg-subtle">
                {skipped} lower-ranked {skipped === 1 ? "file is" : "files are"} skipped
              </span>
            )}
          </div>
          <FileTree files={report.files} />
        </div>
      </div>

      <ErrorNotice error={error} />

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={starting}>
          <ArrowLeft className="size-4" /> Change repository
        </button>
        <button type="button" className="btn btn-primary btn-lg" onClick={onStart} disabled={starting}>
          {starting ? <Spinner /> : <ScanLine className="size-4" />}
          {starting ? "Queuing…" : `Start indexing ${report.selectedCount} files`}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- */
function NewRepository() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [input, setInput] = useState(() => params.get("repo") || "");
  const [report, setReport] = useState(null);
  const inputRef = useRef(null);
  const autoRan = useRef(false);

  const scan = useMutation({
    mutationFn: (repoUrl) => api.post("/projects/validate", { repoUrl }),
    onSuccess: (data) => setReport(data),
  });

  const start = useMutation({
    mutationFn: () => api.post("/projects", { repoUrl: `https://github.com/${report.repo.owner}/${report.repo.repo}` }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.projects });
      if (data.existing) toast("Already indexed — opening it");
      router.push(`/projects/${data.projectId}`);
    },
  });

  const submit = useCallback(
    (value) => {
      const v = (value ?? input).trim();
      if (!v) {
        inputRef.current?.focus();
        return;
      }
      start.reset();
      scan.mutate(v);
    },
    [input, scan, start],
  );

  useEffect(() => {
    const prefill = params.get("repo");
    if (prefill && !autoRan.current) {
      autoRan.current = true;
      submit(prefill);
    }
  }, [params, submit]);

  const back = () => {
    setReport(null);
    scan.reset();
    start.reset();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const slug = toSlug(input);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg">
        <ArrowLeft className="size-3.5" /> Repositories
      </Link>

      <header className="mt-6">
        <span className="eyebrow">New index</span>
        <h1 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[40px]">
          Index a repository<span className="text-signal">.</span>
        </h1>
        <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-fg-muted">
          Paste any public GitHub repository. Zenoryx scans the tree first so you can see exactly what will be indexed before anything runs.
        </p>
      </header>

      {!report && (
        <>
          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor="repo" className="label">
              Repository
            </label>
            <div
              className={cn(
                "flex items-center overflow-hidden rounded-xl border bg-ink-950 transition-[border-color,box-shadow]",
                scan.isError
                  ? "border-coral/60 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-coral)_10%,transparent)]"
                  : "hairline-strong focus-within:border-signal/60 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-signal)_12%,transparent)]",
              )}
            >
              <span className="hidden h-14 select-none items-center border-r hairline bg-ink-900 px-4 font-mono text-sm text-fg-subtle sm:flex">
                github.com/
              </span>
              <input
                ref={inputRef}
                id="repo"
                name="repo"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (scan.isError) scan.reset();
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (/github\.com/i.test(text)) {
                    e.preventDefault();
                    setInput(toSlug(text));
                  }
                }}
                placeholder="owner/repository"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus={!params.get("repo")}
                aria-invalid={scan.isError || undefined}
                aria-describedby="repo-hint"
                disabled={scan.isPending}
                className="h-14 min-w-0 flex-1 bg-transparent px-4 font-mono text-[15px] text-fg outline-none placeholder:text-fg-faint disabled:opacity-60"
              />
              <div className="pr-2">
                <button type="submit" className="btn btn-primary" disabled={scan.isPending || !input.trim()}>
                  {scan.isPending ? <Spinner /> : <ScanLine className="size-4" />}
                  <span className="hidden sm:inline">{scan.isPending ? "Scanning" : "Scan repository"}</span>
                  <span className="sm:hidden">Scan</span>
                </button>
              </div>
            </div>
            <p id="repo-hint" className="mt-2 font-mono text-[11px] text-fg-faint">
              Accepts https://github.com/owner/repo · owner/repo · git@github.com:owner/repo.git
            </p>
          </form>

          <ErrorNotice error={scan.error} />
          {scan.isPending ? <ScanningState slug={slug || "repository"} /> : <NextSteps />}
        </>
      )}

      {report && <ScanReport report={report} onBack={back} onStart={() => start.mutate()} starting={start.isPending} error={start.error} />}
    </main>
  );
}

export default function NewRepositoryPage() {
  return (
    <Suspense fallback={null}>
      <NewRepository />
    </Suspense>
  );
}
