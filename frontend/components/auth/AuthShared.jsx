"use client";

import Link from "next/link";
import { forwardRef, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/format";

/** Only same-site relative paths are allowed as post-auth destinations. */
export function safeNext(next) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}

export function destinationFor(params) {
  const next = safeNext(params.get("next"));
  const repo = params.get("repo");
  return next || (repo ? `/projects/new?repo=${encodeURIComponent(repo)}` : "/dashboard");
}

/** Carries ?next / ?repo across the login ↔ register switch. */
export function carryParams(params) {
  const q = new URLSearchParams();
  for (const key of ["next", "repo"]) if (params.get(key)) q.set(key, params.get(key));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] text-coral">
      {message}
    </p>
  );
}

export function FormAlert({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-coral/30 bg-coral/[0.07] px-3.5 py-3 text-[13px] text-coral">
      <AlertCircle className="mt-px size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export const PasswordInput = forwardRef(function PasswordInput({ invalid, describedBy, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        className="field pr-11"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="icon-btn absolute right-1.5 top-1/2 size-8 -translate-y-1/2"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

export function SignedInNotice({ href }) {
  const { data: user } = useMe();
  if (!user) return null;
  return (
    <Link
      href={href}
      className="mb-6 flex items-center justify-between gap-3 rounded-lg border hairline-strong bg-ink-900 px-3.5 py-2.5 text-[13px] text-fg-muted transition-colors hover:text-fg"
    >
      <span className="truncate">
        You&apos;re signed in as <span className="text-fg">{user.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-signal">
        Continue <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}

export function RepoNotice({ repo }) {
  if (!repo) return null;
  return (
    <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-signal/25 bg-signal/[0.05] px-3.5 py-2.5 text-[13px] text-fg-muted">
      <span className="size-1.5 shrink-0 rounded-full bg-signal" />
      <span className="min-w-0 truncate">
        Next up: indexing <span className="font-mono text-fg">{repo}</span>
      </span>
    </div>
  );
}

export function PasswordStrength({ value = "" }) {
  const score =
    (value.length >= 8 ? 1 : 0) +
    (value.length >= 12 ? 1 : 0) +
    (/[A-Z]/.test(value) && /[a-z]/.test(value) ? 1 : 0) +
    (/\d/.test(value) && /[^A-Za-z0-9]/.test(value) ? 1 : 0);
  const labels = ["Too short", "Okay", "Good", "Strong", "Excellent"];
  const colors = ["bg-coral", "bg-amber", "bg-amber", "bg-signal", "bg-signal"];
  if (!value) return null;
  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < Math.max(score, 1) ? colors[score] : "bg-ink-700")} />
        ))}
      </div>
      <span className="w-16 text-right font-mono text-[11px] text-fg-subtle">{labels[score]}</span>
    </div>
  );
}
