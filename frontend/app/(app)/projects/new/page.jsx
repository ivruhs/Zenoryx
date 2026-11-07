"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, GitBranch, Info, ScanLine, Scissors, Star } from "lucide-react";
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
    <div role="alert" className="paper offset-pink mt-5 flex gap-3.5 p-4 animate-pop" style={{ "--r": "-0.4deg" }}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-pink text-ink">
        <AlertTriangle className="size-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 text-sm">
        <div className="font-display text-base font-bold tracking-tight text-ink">{e.title}</div>
        <div className="mt-0.5 text-ink-2">{e.body}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- */
function ScanningState({ slug }) {
  const rows = [72, 46, 58, 38, 64, 52, 30, 60];
  return (
    <div className="paper tape relative mt-10 p-5 animate-fade-up sm:p-6" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-yellow shadow-[2px_2px_0_0_var(--color-ink)]">
          <Scissors className="size-5 [animation:snip_0.5s_ease-in-out_infinite]" />
        </span>
        <div className="min-w-0">
          <div className="font-display text-lg font-bold tracking-tight">
            Scanning <span className="font-mono text-base font-normal text-ink-2">{slug}</span>
          </div>
          <div className="font-mono text-[11px] text-ink-3">reading the git tree · ranking files by architectural relevance</div>
        </div>
      </div>
      <div className="relative mt-5 space-y-2.5 overflow-hidden rounded-xl border-[1.5px] border-dashed border-ink/25 bg-paper p-4">
        {rows.map((w, i) => (
          <div key={i} className="flex items-center gap-2.5" style={{ paddingLeft: (i % 3) * 14 }}>
            <span className="size-2.5 shrink-0 rounded-full border border-ink/30 bg-paper-3" />
            <span className="skeleton h-2.5" style={{ width: `${w}%` }} />
          </div>
        ))}
        {/* A cut-line sweeps down the tree like a paper guillotine. */}
        <div className="pointer-events-none absolute inset-0" style={{ animation: "scan 1.8s linear infinite" }} aria-hidden="true">
          <div className="h-12 bg-gradient-to-b from-transparent to-pink/15" />
          <div className="relative border-t-2 border-dashed border-pink-deep">
            <Scissors className="absolute -top-[11px] right-2 size-5 bg-paper text-pink-deep" />
          </div>
        </div>
      </div>
    </div>
  );
}

const STAGE_INKS = ["var(--color-yellow)", "var(--color-pink)", "var(--color-blue-soft)", "var(--color-green-soft)", "var(--color-orange-soft)"];

function NextSteps() {
  return (
    <section className="mt-14" aria-labelledby="next-steps">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 id="next-steps" className="eyebrow">
          What happens next
        </h2>
        <span className="hand text-lg text-ink-3">(it&apos;s all automatic)</span>
      </div>
      <ol className="mt-6 grid gap-x-3 gap-y-6 sm:grid-cols-5">
        {STAGES.map((s, i) => (
          <li key={s.id} className="paper-soft relative p-4 pt-5">
            <span
              className="absolute -top-3.5 left-3 grid size-7 place-items-center rounded-full border-[1.5px] border-ink font-mono text-[11px] font-bold"
              style={{ background: STAGE_INKS[i] }}
            >
              {i + 1}
            </span>
            <div className="font-display text-base font-bold tracking-tight">{s.label}</div>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">{s.verb}</p>
            <div className="mt-2 font-mono text-[10.5px] text-ink-3">{s.hint}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------------------- */
function StatCell({ label, value, sub }) {
  return (
    <div className="px-5 py-4">
      <div className="eyebrow !text-[10px]">{label}</div>
      <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

function ScanReport({ report, onBack, onStart, starting, error }) {
  const { repo } = report;
  const skipped = report.totalFiles - report.selectedCount;
  return (
    <div className="mt-10 animate-fade-up">
      <div className="paper tape relative" style={{ "--tape-r": "2deg" }}>
        {/* Slip header strip */}
        <div className="flex items-center justify-between gap-3 rounded-t-[14px] border-b-[1.5px] border-ink bg-yellow px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] sm:px-6">
          <span>Inspection slip</span>
          <span className="hidden truncate sm:inline">
            {repo.owner}/{repo.repo} @ {repo.defaultBranch}
          </span>
        </div>

        {/* Repo header */}
        <div className="relative border-b-2 border-dashed border-ink/20 p-5 sm:p-6">
          <span className="stamp absolute right-4 top-5 animate-stamp sm:right-6" style={{ "--stamp": "var(--color-green)", "--r": "-8deg" }}>
            Passed
          </span>
          <h2 className="break-words pr-24 font-mono text-lg sm:text-xl">
            <span className="text-ink-3">{repo.owner}/</span>
            <span className="font-bold text-ink">{repo.repo}</span>
          </h2>
          {repo.description && <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{repo.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {repo.stars != null && (
              <span className="sticker bg-yellow text-xs" style={{ "--r": "-2deg" }}>
                <Star className="size-3 fill-ink" /> {formatCount(repo.stars)}
              </span>
            )}
            <span className="sticker bg-blue-soft text-xs" style={{ "--r": "1.5deg" }}>
              <GitBranch className="size-3" /> {repo.defaultBranch}
            </span>
            {repo.primaryLanguage && (
              <span className="sticker bg-pink-soft text-xs" style={{ "--r": "-1deg" }}>
                {repo.primaryLanguage}
              </span>
            )}
          </div>
          <LanguageBar languages={report.languages} legend max={6} className="mt-5" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 divide-y-2 divide-dashed divide-ink/15 border-b-2 border-dashed border-ink/20 sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0">
          <StatCell label="Supported files" value={report.totalFiles} sub="Source & docs in the tree" />
          <StatCell
            label="Will index"
            value={
              <>
                <span className="marker marker-pink">{report.selectedCount}</span>
                <span className="text-ink-4"> / {report.totalFiles}</span>
              </>
            }
            sub={skipped > 0 ? "Ranked by architectural relevance" : "Every supported file"}
          />
          <StatCell label="Per-repo limit" value={report.maxFiles} sub="Free-tier friendly" />
        </div>

        <div className="p-5 sm:p-6">
          {report.existingProjectId && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] border-ink bg-blue-soft p-3.5 text-sm">
              <Info className="size-4 shrink-0 text-blue" />
              <span className="min-w-0 flex-1 text-ink">You&apos;ve already indexed this repository.</span>
              <Link href={`/projects/${report.existingProjectId}`} className="btn btn-secondary btn-sm">
                Open existing <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
          {report.truncated && (
            <p className="mb-4 flex items-center gap-2 text-xs text-ink-2">
              <Info className="size-3.5 text-orange" /> GitHub truncated this tree (very large repository) — some files aren&apos;t listed.
            </p>
          )}
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-display text-base font-bold tracking-tight">Files</h3>
            {skipped > 0 && (
              <span className="hand text-lg leading-none text-ink-3">
                {skipped} lower-ranked {skipped === 1 ? "file stays" : "files stay"} on the cutting-room floor
              </span>
            )}
          </div>
          <FileTree files={report.files} />
        </div>
      </div>

      <ErrorNotice error={error} />

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={starting}>
          <ArrowLeft className="size-4" /> Change repository
        </button>
        <button type="button" className="btn btn-pink btn-lg" onClick={onStart} disabled={starting}>
          {starting ? <Spinner /> : <Scissors className="size-4" />}
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
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" /> Repositories
      </Link>

      <header className="relative mt-6">
        <span className="eyebrow">New index</span>
        <h1
          className="misreg mt-3 text-[2.6rem] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-6xl"
          style={{ fontVariationSettings: '"wdth" 84' }}
        >
          Index a repository<span className="text-pink">.</span>
        </h1>
        <span className="hand absolute -top-1 right-0 hidden rotate-3 text-xl text-pink-deep sm:block">any public one!</span>
        <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-ink-2">
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
                "flex items-center overflow-hidden rounded-2xl border-[1.5px] border-ink bg-paper-2 transition-[box-shadow,transform] duration-200 ease-[var(--ease-spring)]",
                scan.isError
                  ? "shadow-[5px_5px_0_0_var(--color-pink)]"
                  : "shadow-[3px_3px_0_0_var(--color-ink)] focus-within:-translate-x-0.5 focus-within:-translate-y-0.5 focus-within:shadow-[6px_6px_0_0_var(--color-blue)]",
              )}
            >
              <span className="hidden h-16 select-none items-center border-r-[1.5px] border-dashed border-ink/30 bg-paper px-4 font-mono text-sm text-ink-3 sm:flex">
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
                className="h-16 min-w-0 flex-1 bg-transparent px-4 font-mono text-[15px] text-ink outline-none placeholder:text-ink-4 disabled:opacity-60"
              />
              <div className="pr-2">
                <button type="submit" className="btn btn-primary" disabled={scan.isPending || !input.trim()}>
                  {scan.isPending ? <Spinner /> : <ScanLine className="size-4" />}
                  <span className="hidden sm:inline">{scan.isPending ? "Scanning" : "Scan repository"}</span>
                  <span className="sm:hidden">Scan</span>
                </button>
              </div>
            </div>
            <p id="repo-hint" className="mt-2.5 font-mono text-[11px] text-ink-3">
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
