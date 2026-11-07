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
          "group flex h-8 w-full items-center gap-2 rounded-lg pr-2 text-left text-[13.5px] transition-colors",
          active ? "bg-yellow font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--color-ink)]" : "text-ink-2 hover:bg-paper-3 hover:text-ink",
        )}
        style={{ paddingLeft: depth * 12 + 10 }}
      >
        <LangDot language={node.file.language} />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {cited && <span className="size-2 shrink-0 rounded-full border border-ink bg-pink" title="Cited in the selected answer" />}
        <span className="shrink-0 font-mono text-[10px] text-ink-4 group-hover:text-ink-3" title={`${node.file.chunks} chunks`}>
          {node.file.chunks}
        </span>
      </button>
    );
  }
  const isOpen = expanded.has(node.path);
  return (
    <div>
      <button
        type="button"
        onClick={() => toggle(node.path)}
        className="flex h-8 w-full items-center gap-1.5 rounded-lg pr-2 text-left font-display text-[13.5px] font-semibold text-ink-2 hover:bg-paper-3 hover:text-ink"
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
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files or symbols"
            aria-label="Filter files"
            className="h-9 w-full rounded-full border-[1.5px] border-ink bg-paper-2 pl-8 pr-8 text-[13px] outline-none transition-shadow placeholder:text-ink-4 focus:shadow-[3px_3px_0_0_var(--color-blue)]"
          />
          {filter && (
            <button type="button" onClick={() => setFilter("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink" aria-label="Clear filter">
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
        {isError && <p className="px-3 text-sm text-pink-deep">Couldn&apos;t load files.</p>}
        {!isPending && visible.length === 0 && <p className="hand px-3 pt-2 text-xl text-ink-3">nothing matches “{filter}”</p>}
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
  if (!commits.length) return <p className="hand p-4 text-xl text-ink-3">no commit history captured for this one.</p>;
  return (
    <ol className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-1">
      {commits.map((c, i) => {
        const total = (c.additions || 0) + (c.deletions || 0);
        return (
          <li key={c.id} className="relative pb-5 pl-5 last:pb-0">
            {i < commits.length - 1 && <span className="absolute left-[4px] top-4 h-full border-l-2 border-dashed border-ink-4" />}
            <span className="absolute left-0 top-1.5 size-[10px] rounded-full border-[1.5px] border-ink bg-yellow" />
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <a
                href={`https://github.com/${project.repoOwner}/${project.repoName}/commit/${c.sha}`}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue hover:underline"
              >
                {c.sha.slice(0, 7)}
              </a>
              <span className="text-ink-4">·</span>
              <span className="text-ink-3">{timeAgo(c.date)}</span>
              {total > 0 && (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="font-bold text-green">+{c.additions}</span>
                  <span className="font-bold text-pink-deep">−{c.deletions}</span>
                </span>
              )}
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{c.aiSummary}</p>
            <p className="mt-1 truncate text-xs text-ink-3" title={c.message}>
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
      <div className="flex items-end gap-1 px-3 pt-3" role="tablist">
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
              "relative z-10 -mb-[1.5px] flex h-9 items-center gap-1.5 rounded-t-xl border-[1.5px] border-b-0 px-3 font-display text-[13.5px] font-semibold transition-colors",
              tab === t.id ? "border-ink bg-paper-2 text-ink" : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
            {t.count ? <span className="rounded-full bg-paper-3 px-1.5 font-mono text-[10px] text-ink-2">{t.count}</span> : null}
          </button>
        ))}
      </div>
      <div className="mb-3 border-t-[1.5px] border-ink" />
      {tab === "files" ? (
        <FilesTab projectId={project.id} openFile={openFile} activePath={activePath} citedPaths={citedPaths} />
      ) : (
        <CommitsTab projectId={project.id} project={project} />
      )}
    </div>
  );
}
