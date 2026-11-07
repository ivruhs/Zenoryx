"use client";

import Link from "next/link";
import { forwardRef, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/format";

/** Only same-site relative paths are allowed as post-auth destinations. */
export function safeNext(next) {
  if (typeof next !== "string" || !next.startsWith("/") || /[\x00-\x1f\\]/.test(next)) return null;
  try {
    // Resolve exactly like the browser will; anything that leaves our origin is rejected.
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(next, base);
    return u.origin === base ? `${u.pathname}${u.search}${u.hash}` : null;
  } catch {
    return null;
  }
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
    <p id={id} role="alert" className="hand mt-1 text-lg leading-tight text-pink-deep">
      {message}
    </p>
  );
}

export function FormAlert({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border-[1.5px] border-pink-deep bg-pink-soft px-3.5 py-3 text-sm font-medium text-ink">
      <AlertCircle className="mt-px size-4 shrink-0 text-pink-deep" />
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
      className="mb-6 flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-ink bg-green-soft px-3.5 py-2.5 text-sm text-ink-2 transition-transform hover:-translate-y-0.5"
    >
      <span className="truncate">
        You&apos;re signed in as <span className="font-semibold text-ink">{user.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-display font-bold text-ink">
        Continue <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}

export function RepoNotice({ repo }) {
  if (!repo) return null;
  return (
    <div className="tape mb-7 rounded-xl border-[1.5px] border-ink bg-yellow-soft px-3.5 py-2.5 text-sm text-ink-2" style={{ "--tape-r": "4deg" }}>
      <span className="min-w-0 truncate">
        Next up: cutting <span className="font-mono font-bold text-ink">{repo}</span>
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
  const colors = ["bg-pink", "bg-orange", "bg-yellow", "bg-green", "bg-green"];
  if (!value) return null;
  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full border border-ink/60 transition-colors",
              i < Math.max(score, 1) ? colors[score] : "bg-paper-3",
            )}
          />
        ))}
      </div>
      <span className="w-20 text-right font-mono text-[11px] text-ink-3">{labels[score]}</span>
    </div>
  );
}
