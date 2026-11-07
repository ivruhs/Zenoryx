"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FolderGit2, LayoutGrid, LogOut, Plus, Search } from "lucide-react";
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
    <div className="grid min-h-dvh place-items-center bg-ink-950">
      <div className="flex flex-col items-center gap-4 text-fg-subtle">
        <LogoMark className="size-9 animate-pulse" />
        <span className="eyebrow">Authenticating</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- */
function Initials({ name }) {
  const initials = (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="grid size-8 place-items-center rounded-full border hairline-strong bg-gradient-to-b from-ink-700 to-ink-800 font-mono text-[11px] font-medium text-fg">
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
    toast("Signed out");
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="rounded-full">
        <Initials name={user.name} />
      </button>
      {open && (
        <div role="menu" className="panel-raised absolute right-0 top-11 z-50 w-64 animate-fade-in p-1.5">
          <div className="px-3 py-2.5">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate font-mono text-xs text-fg-subtle">{user.email}</div>
          </div>
          <div className="my-1 border-t hairline" />
          <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-ink-800 hover:text-fg">
            <LayoutGrid className="size-4" /> Repositories
          </Link>
          <button type="button" role="menuitem" onClick={signOut} disabled={busy} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-ink-800 hover:text-fg">
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-[2px] animate-fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Command palette"
        className="panel-raised w-full max-w-xl overflow-hidden"
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
        <div className="flex items-center gap-3 border-b hairline px-4">
          <Search className="size-4 text-fg-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a repository or action…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-faint"
          />
          <span className="kbd">esc</span>
        </div>
        <ul className="scroll-thin max-h-[50vh] overflow-y-auto p-1.5">
          {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-fg-subtle">No matches for “{query}”.</li>}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseMove={() => setCursor(i)}
                  onClick={() => go(item)}
                  className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left", i === cursor ? "bg-ink-750" : "")}
                >
                  <Icon className={cn("size-4 shrink-0", i === cursor ? "text-signal" : "text-fg-subtle")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{item.label}</span>
                    {item.hint && <span className="block truncate text-xs text-fg-subtle">{item.hint}</span>}
                  </span>
                  {item.project ? <StatusPill status={item.project.status} /> : <span className="eyebrow">{item.hint}</span>}
                  {i === cursor && <ArrowRight className="size-3.5 text-fg-subtle" />}
                </button>
              </li>
            );
          })}
        </ul>
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
      className="hidden items-center gap-2 rounded-full border border-amber/25 bg-amber/5 px-3 py-1 font-mono text-[11px] text-amber md:flex"
    >
      <span className="size-1.5 animate-pulse-dot rounded-full bg-amber" />
      Indexing {active.length === 1 ? `${active[0].repoName}` : `${active.length} repos`}
      {active.length === 1 && active[0].status === "PROCESSING" && (
        <span className="tabular-nums text-amber/70">· {overallProgress(active[0])}%</span>
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
    <div className="flex min-h-dvh flex-col bg-ink-950">
      <header className="sticky top-0 z-40 border-b hairline bg-ink-950/80 backdrop-blur-xl">
        <div className={cn("mx-auto flex h-14 items-center gap-4 px-4 sm:px-6", fullBleed ? "max-w-none" : "max-w-7xl")}>
          <Link href="/dashboard" className="shrink-0" aria-label="Zenoryx home">
            <Logo />
          </Link>
          <div className="flex-1" />
          <IndexingBeacon />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-8 w-64 items-center gap-2 rounded-lg border hairline-strong bg-ink-900 px-2.5 text-left text-[13px] text-fg-subtle transition-colors hover:border-white/20 hover:text-fg-muted sm:flex"
          >
            <Search className="size-3.5" />
            <span className="flex-1">Search repositories…</span>
            <span className="kbd">⌘K</span>
          </button>
          <button type="button" onClick={() => setPaletteOpen(true)} className="icon-btn sm:hidden" aria-label="Search">
            <Search className="size-4" />
          </button>
          <Link href="/projects/new" className="btn btn-primary btn-sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">New</span>
          </Link>
          <UserMenu user={me.data} />
        </div>
      </header>
      <CompletionNotifier />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {children}
    </div>
  );
}
