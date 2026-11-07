"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/format";

const REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;

/** Accepts "owner/repo" or any pasted github.com URL. */
export function normalizeRepo(input) {
  const s = input
    .trim()
    .replace(/^git@github\.com:/i, "")
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "");
  const [owner, repo] = s.split(/[/?#]/).filter(Boolean);
  const candidate = owner && repo ? `${owner}/${repo.replace(/\.git$/i, "")}` : "";
  return REPO_RE.test(candidate) ? candidate : null;
}

export function HeroForm({ className }) {
  const router = useRouter();
  const { data: user } = useMe();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const repo = normalizeRepo(value || "expressjs/cors");
    if (!repo) {
      setError("Use the owner/repo format, e.g. expressjs/cors");
      return;
    }
    const q = `repo=${encodeURIComponent(repo)}`;
    router.push(user ? `/projects/new?${q}` : `/register?${q}`);
  };

  return (
    <form onSubmit={submit} className={cn("w-full max-w-xl", className)} noValidate>
      <label htmlFor="hero-repo" className="sr-only">
        GitHub repository
      </label>
      <div
        className={cn(
          "group flex h-14 items-center rounded-xl border bg-ink-900 p-1.5 pl-4 transition-[border-color,box-shadow]",
          error
            ? "border-coral/60"
            : "border-[var(--line-strong)] focus-within:border-signal/60 focus-within:shadow-[0_0_0_4px_rgba(200,245,66,0.08)]",
        )}
      >
        <span className="select-none font-mono text-sm text-fg-subtle">github.com/</span>
        <input
          id="hero-repo"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          placeholder="expressjs/cors"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby="hero-repo-hint"
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-fg outline-none placeholder:text-fg-faint"
        />
        <button type="submit" className="btn btn-primary h-full shrink-0 px-4">
          <span className="hidden sm:inline">Index repository</span>
          <span className="sm:hidden">Index</span>
          <ArrowRight className="size-4" />
        </button>
      </div>
      <p id="hero-repo-hint" className={cn("mt-2.5 font-mono text-[11px]", error ? "text-coral" : "text-fg-subtle")}>
        {error || "Any public repository · top 36 files ranked by relevance · free"}
      </p>
    </form>
  );
}

export function CtaButtons({ className }) {
  const { data: user } = useMe();
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {user ? (
        <Link href="/dashboard" className="btn btn-primary btn-lg">
          Open dashboard <ArrowRight className="size-4" />
        </Link>
      ) : (
        <>
          <Link href="/register" className="btn btn-primary btn-lg">
            Create a free account <ArrowRight className="size-4" />
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg">
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}
