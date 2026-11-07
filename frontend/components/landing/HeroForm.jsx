"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Scissors } from "lucide-react";
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
          "group flex h-16 items-center rounded-full border-[1.5px] border-ink bg-paper-2 p-1.5 pl-5 transition-[box-shadow,transform] duration-200",
          error
            ? "shadow-[5px_5px_0_0_var(--color-pink-deep)]"
            : "shadow-[5px_5px_0_0_var(--color-ink)] focus-within:-translate-x-0.5 focus-within:-translate-y-0.5 focus-within:shadow-[7px_7px_0_0_var(--color-blue)]",
        )}
      >
        <span className="select-none font-mono text-sm text-ink-3">github.com/</span>
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
          className="min-w-0 flex-1 bg-transparent font-mono text-[15px] text-ink outline-none placeholder:text-ink-4"
        />
        <button
          type="submit"
          className="btn btn-pink h-full shrink-0 px-5 shadow-none hover:shadow-none sm:px-6"
        >
          <Scissors className="size-4" />
          <span className="hidden sm:inline">Cut it up</span>
          <span className="sm:hidden">Cut</span>
        </button>
      </div>
      <p id="hero-repo-hint" className={cn("mt-4 pl-5 font-mono text-[12px]", error ? "text-pink-deep" : "text-ink-3")}>
        {error || "any public repo · top 36 files ranked by relevance · free"}
      </p>
    </form>
  );
}

export function CtaButtons({ className }) {
  const { data: user } = useMe();
  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {user ? (
        <Link href="/dashboard" className="btn btn-primary btn-lg">
          Open dashboard <ArrowRight className="size-4" />
        </Link>
      ) : (
        <>
          <Link href="/register" className="btn btn-pink btn-lg">
            Redeem it — it&apos;s free <ArrowRight className="size-4" />
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg">
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}
