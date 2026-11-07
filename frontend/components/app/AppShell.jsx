"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FolderGit2, LayoutGrid, LogOut, Plus, Scissors, Search } from "lucide-react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { StatusPill } from "@/components/ui/StatusPill";
import { Spinner } from "@/components/ui/Spinner";
import { useMe } from "@/hooks/useMe";
import { useProjects } from "@/hooks/useProjects";
import { api } from "@/lib/api";
import { cn } from "@/lib/format";
import { isActive, overallProgress } from "@/lib/pipeline";

/* ----------------------------------------------------------------------------
 * Auth gate: the middleware already bounced cookie-less visitors; this handles
 * stale/revoked cookies (API says 401) without a flash of protected content.
 * -------------------------------------------------------------------------- */
function useRequireUser() {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  useEffect(() => {
    if (me.isSuccess && me.data === null) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [me.isSuccess, me.data, pathname, router]);
  return me;
}

function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="size-12 animate-wiggle" />
        <span className="hand text-xl text-ink-3">checking your library card…</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- */
const AVATAR_INKS = ["var(--color-yellow)", "var(--color-pink)", "var(--color-blue-soft)", "var(--color-green-soft)", "var(--color-orange-soft)"];

function Initials({ name }) {
  const initials = (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const ink = AVATAR_INKS[(name || "").length % AVATAR_INKS.length];
  return (
    <span
      className="grid size-9 place-items-center rounded-full border-[1.5px] border-ink font-display text-[13px] font-extrabold text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-transform duration-200 hover:-rotate-6"
      style={{ background: ink }}
    >
      {initials}
    </span>
  );
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = async () => {
    setBusy(true);
    try {
      await api.post("/auth/logout");
    } catch {
      /* cookie is cleared server-side either way */
    }
    queryClient.clear();
    router.replace("/login");
    toast("Signed out", { description: "See you next issue." });
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={user.name} className="rounded-full">
        <Initials name={user.name} />
      </button>
      {open && (
        <div role="menu" className="paper offset-pink absolute right-0 top-12 z-50 w-64 animate-pop p-1.5" style={{ "--r": "0deg" }}>
          <div className="px-3 pb-2.5 pt-2">
            <div className="truncate font-display text-base font-bold tracking-tight">{user.name}</div>
            <div className="truncate font-mono text-xs text-ink-3">{user.email}</div>
          </div>
          <div className="cutline mx-2 my-1" />
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-paper-3 hover:text-ink"
          >
            <LayoutGrid className="size-4" /> Repositories
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-pink-soft hover:text-ink"
          >
            {busy ? <Spinner className="size-4" /> : <LogOut className="size-4" />} Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * ⌘K command palette — jump to any repository or action from anywhere.
 * -------------------------------------------------------------------------- */
function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const { data: projects = [] } = useProjects();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actions = [
      { id: "new", label: "Index a new repository", hint: "Action", icon: Plus, href: "/projects/new" },
      { id: "dash", label: "All repositories", hint: "Navigate", icon: LayoutGrid, href: "/dashboard" },
    ];
    const repos = projects.map((p) => ({
      id: p.id,
      label: `${p.repoOwner}/${p.repoName}`,
      hint: p.description || "",
      icon: FolderGit2,
      href: `/projects/${p.id}`,
      project: p,
    }));
    const all = [...repos, ...actions];
    return q ? all.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q)) : all;
  }, [projects, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setCursor(0), [query]);

  if (!open) return null;
  const go = (item) => {
    onClose();
    router.push(item.href);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/30 px-4 pt-[12vh] backdrop-blur-[2px] animate-fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Command palette"
        className="paper offset-pink tape tape-pink w-full max-w-xl animate-pop"
        style={{ "--r": "-0.4deg", "--tape-r": "2deg" }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, items.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          }
          if (e.key === "Enter" && items[cursor]) go(items[cursor]);
        }}
      >
        <div className="flex items-center gap-3 border-b-2 border-dashed border-ink/25 px-4">
          <Search className="size-4 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a repository or action…"
            aria-label="Search repositories and actions"
            className="h-14 flex-1 bg-transparent font-display text-[17px] font-medium text-ink outline-none placeholder:text-ink-4"
          />
          <span className="kbd">esc</span>
        </div>
        <ul className="scroll-thin max-h-[50vh] overflow-y-auto p-1.5">
          {items.length === 0 && (
            <li className="px-3 py-10 text-center">
              <span className="hand block text-2xl text-ink-3">nothing in the archive for “{query}”</span>
            </li>
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            const on = i === cursor;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseMove={() => setCursor(i)}
                  onClick={() => go(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    on ? "bg-yellow-soft" : "",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg border-[1.5px] transition-colors",
                      on ? "border-ink bg-pink text-ink" : "border-ink/20 bg-paper text-ink-3",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{item.label}</span>
                    {item.project && item.hint && <span className="block truncate text-xs text-ink-3">{item.hint}</span>}
                  </span>
                  {item.project ? <StatusPill status={item.project.status} /> : <span className="eyebrow">{item.hint}</span>}
                  {on && <ArrowRight className="size-4 text-ink" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-3 border-t border-dashed border-ink/20 px-4 py-2 font-mono text-[11px] text-ink-3">
          <span className="flex items-center gap-1">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> move
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd">↵</span> open
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- */
function IndexingBeacon() {
  const { data: projects = [] } = useProjects();
  const active = projects.filter((p) => isActive(p.status));
  if (!active.length) return null;
  return (
    <Link
      href={`/projects/${active[0].id}`}
      className="sticker hidden bg-orange-soft text-[12px] md:inline-flex"
      style={{ "--r": "-2deg" }}
      title="Open the repository being indexed"
    >
      <span className="size-2 animate-pulse-dot rounded-full bg-orange" />
      Printing {active.length === 1 ? `${active[0].repoName}` : `${active.length} repos`}
      {active.length === 1 && active[0].status === "PROCESSING" && (
        <span className="font-mono tabular-nums text-ink-2">· {overallProgress(active[0])}%</span>
      )}
    </Link>
  );
}

/** Watches background ingestion and toasts when something finishes. */
function CompletionNotifier() {
  const { data: projects } = useProjects();
  const prev = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!projects) return;
    const before = prev.current;
    if (before) {
      for (const p of projects) {
        const old = before.get(p.id);
        if (pathname === `/projects/${p.id}`) continue; // already watching it
        if (old && isActive(old) && p.status === "READY") {
          toast.success(`${p.repoOwner}/${p.repoName} is ready`, {
            description: `${p.chunkCount} semantic chunks indexed.`,
            action: { label: "Open", onClick: () => router.push(`/projects/${p.id}`) },
          });
        } else if (old && isActive(old) && p.status === "FAILED") {
          toast.error(`Indexing failed for ${p.repoName}`, { description: p.errorMessage || undefined });
        }
      }
    }
    prev.current = new Map(projects.map((p) => [p.id, p.status]));
  }, [projects, router, pathname]);
  return null;
}

export function AppShell({ children, fullBleed = false }) {
  const me = useRequireUser();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (me.isPending || !me.data) return <BootScreen />;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md">
        <div className={cn("mx-auto flex h-16 items-center gap-3 px-4 sm:gap-4 sm:px-6", fullBleed ? "max-w-none" : "max-w-7xl")}>
          <Link href="/dashboard" className="shrink-0 transition-transform duration-200 hover:-rotate-2" aria-label="Zenoryx home">
            <Logo />
          </Link>
          <div className="flex-1" />
          <IndexingBeacon />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-64 items-center gap-2 rounded-full border-[1.5px] border-ink/25 bg-paper-2 px-3.5 text-left text-sm text-ink-3 transition-colors hover:border-ink hover:text-ink-2 sm:flex"
          >
            <Search className="size-3.5" />
            <span className="flex-1">Search repositories…</span>
            <span className="kbd">⌘K</span>
          </button>
          <button type="button" onClick={() => setPaletteOpen(true)} className="icon-btn sm:hidden" aria-label="Search">
            <Search className="size-4" />
          </button>
          <Link href="/projects/new" className="btn btn-pink btn-sm">
            <Plus className="size-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">New</span>
          </Link>
          <UserMenu user={me.data} />
        </div>
        {/* Cut-along-the-dotted-line rule */}
        <div className="relative h-0" aria-hidden="true">
          <div className="cutline mx-4 sm:mx-6" />
          <Scissors className="absolute -top-[9px] left-1 size-[18px] bg-paper px-0.5 text-ink-3 sm:left-2" />
        </div>
      </header>
      <CompletionNotifier />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {children}
    </div>
  );
}
