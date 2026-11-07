"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen, GitCommitHorizontal, Search, X } from "lucide-react";
import { LangDot } from "@/components/ui/LanguageBar";
import { cn, timeAgo } from "@/lib/format";
import { useCommits, useFiles } from "./hooks";

function buildTree(files) {
  const root = { name: "", path: "", children: new Map(), file: null };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      if (!node.children.has(part)) node.children.set(part, { name: part, path, children: new Map(), file: null });
      node = node.children.get(part);
      if (i === parts.length - 1) node.file = f;
    });
  }
  // Collapse single-child directory chains: src/ → app/ → api/  ⇒  src/app/api
  const compact = (node) => {
    for (const child of node.children.values()) compact(child);
    if (!node.file && node.children.size === 1 && node.path) {
      const [only] = node.children.values();
      if (!only.file) {
        node.name = `${node.name}/${only.name}`;
        node.path = only.path;
        node.children = only.children;
      }
    }
  };
  compact(root);
  return root;
}

function sortNodes(nodes) {
  return [...nodes].sort((a, b) => (a.file ? 1 : 0) - (b.file ? 1 : 0) || a.name.localeCompare(b.name));
}

function TreeNode({ node, depth, openFile, activePath, expanded, toggle, citedPaths }) {
  if (node.file) {
    const active = activePath === node.path;
    const cited = citedPaths.has(node.path);
    return (
      <button
        type="button"
        onClick={() => openFile(node.path)}
        title={node.file.summary || node.path}
        className={cn(
          "group flex h-7 w-full items-center gap-2 rounded-md pr-2 text-left text-[13px] transition-colors",
          active ? "bg-ink-750 text-fg" : "text-fg-muted hover:bg-ink-800 hover:text-fg",
        )}
        style={{ paddingLeft: depth * 12 + 10 }}
      >
        <LangDot language={node.file.language} />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {cited && <span className="size-1.5 shrink-0 rounded-full bg-signal" title="Cited in the selected answer" />}
        <span className="shrink-0 font-mono text-[10px] text-fg-faint group-hover:text-fg-subtle">{node.file.chunks}</span>
      </button>
    );
  }
  const isOpen = expanded.has(node.path);
  return (
    <div>
      <button
        type="button"
        onClick={() => toggle(node.path)}
        className="flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[13px] text-fg-subtle hover:bg-ink-800 hover:text-fg"
        style={{ paddingLeft: depth * 12 + 4 }}
        aria-expanded={isOpen}
      >
        <ChevronRight className={cn("size-3 shrink-0 transition-transform", isOpen && "rotate-90")} />
        {isOpen ? <FolderOpen className="size-3.5 shrink-0" /> : <Folder className="size-3.5 shrink-0" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isOpen &&
        sortNodes(node.children.values()).map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} openFile={openFile} activePath={activePath} expanded={expanded} toggle={toggle} citedPaths={citedPaths} />
        ))}
    </div>
  );
}

function FilesTab({ projectId, openFile, activePath, citedPaths }) {
  const { data: files = [], isPending, isError } = useFiles(projectId, true);
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? files.filter((f) => f.path.toLowerCase().includes(q) || (f.symbols || []).some((s) => s.toLowerCase().includes(q))) : files;
  }, [files, filter]);
  const tree = useMemo(() => buildTree(visible), [visible]);
  // Folders start expanded; we track the ones the user collapsed.
  const allDirs = useMemo(() => {
    const dirs = new Set();
    const walk = (n) => n.children.forEach((c) => (c.file ? null : (dirs.add(c.path), walk(c))));
    walk(tree);
    return dirs;
  }, [tree]);
  const expanded = useMemo(() => new Set([...allDirs].filter((d) => filter || !collapsed.has(d))), [allDirs, collapsed, filter]);
  const toggle = (path) =>
    setCollapsed((s) => {
      const next = new Set(s);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pb-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-faint" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files or symbols"
            aria-label="Filter files"
            className="h-8 w-full rounded-lg border hairline bg-ink-950 pl-8 pr-7 text-[13px] outline-none placeholder:text-fg-faint focus:border-signal/50"
          />
          {filter && (
            <button type="button" onClick={() => setFilter("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg" aria-label="Clear filter">
              <X className="size-3.5" />
            </button>
          )}
        </label>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {isPending && (
          <div className="space-y-2 px-2 pt-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton h-5" style={{ width: `${55 + ((i * 17) % 40)}%` }} />
            ))}
          </div>
        )}
        {isError && <p className="px-3 text-sm text-coral">Couldn&apos;t load files.</p>}
        {!isPending && visible.length === 0 && <p className="px-3 pt-2 text-sm text-fg-subtle">No files match “{filter}”.</p>}
        {sortNodes(tree.children.values()).map((node) => (
          <TreeNode key={node.path} node={node} depth={0} openFile={openFile} activePath={activePath} expanded={expanded} toggle={toggle} citedPaths={citedPaths} />
        ))}
      </div>
    </div>
  );
}

function CommitsTab({ projectId, project }) {
  const { data: commits = [], isPending } = useCommits(projectId, true);
  if (isPending)
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  if (!commits.length) return <p className="p-4 text-sm text-fg-subtle">No commit history was captured for this repository.</p>;
  return (
    <ol className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-1">
      {commits.map((c, i) => {
        const total = (c.additions || 0) + (c.deletions || 0);
        return (
          <li key={c.id} className="relative pb-5 pl-5 last:pb-0">
            {i < commits.length - 1 && <span className="absolute left-[3px] top-3 h-full w-px bg-[var(--line-strong)]" />}
            <span className="absolute left-0 top-1.5 size-[7px] rounded-full border border-fg-subtle bg-ink-900" />
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <a
                href={`https://github.com/${project.repoOwner}/${project.repoName}/commit/${c.sha}`}
                target="_blank"
                rel="noreferrer"
                className="text-signal hover:underline"
              >
                {c.sha.slice(0, 7)}
              </a>
              <span className="text-fg-faint">·</span>
              <span className="text-fg-subtle">{timeAgo(c.date)}</span>
              {total > 0 && (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="text-signal/80">+{c.additions}</span>
                  <span className="text-coral/80">−{c.deletions}</span>
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-fg">{c.aiSummary}</p>
            <p className="mt-1 truncate text-xs text-fg-subtle" title={c.message}>
              {c.message.split("\n")[0]} — {c.authorName}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function Explorer({ project, openFile, activePath, citedPaths }) {
  const [tab, setTab] = useState("files");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 p-3" role="tablist">
        {[
          { id: "files", label: "Files", icon: Folder, count: project.fileCount },
          { id: "history", label: "History", icon: GitCommitHorizontal },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors",
              tab === t.id ? "bg-ink-750 text-fg" : "text-fg-subtle hover:text-fg",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
            {t.count ? <span className="font-mono text-[10px] text-fg-faint">{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tab === "files" ? (
        <FilesTab projectId={project.id} openFile={openFile} activePath={activePath} citedPaths={citedPaths} />
      ) : (
        <CommitsTab projectId={project.id} project={project} />
      )}
    </div>
  );
}
