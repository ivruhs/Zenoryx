"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen, Search } from "lucide-react";
import { LangDot } from "@/components/ui/LanguageBar";
import { cn, formatBytes } from "@/lib/format";

/** Builds a nested tree from flat paths. Folders first, then files, alphabetical. */
function buildTree(files) {
  const root = { name: "", path: "", dirs: new Map(), files: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    parts.slice(0, -1).forEach((part, i) => {
      if (!node.dirs.has(part)) {
        node.dirs.set(part, { name: part, path: parts.slice(0, i + 1).join("/"), dirs: new Map(), files: [] });
      }
      node = node.dirs.get(part);
    });
    node.files.push({ ...f, name: parts[parts.length - 1] });
  }
  return root;
}

function countFiles(node) {
  let selected = node.files.filter((f) => f.selected).length;
  let total = node.files.length;
  for (const d of node.dirs.values()) {
    const c = countFiles(d);
    selected += c.selected;
    total += c.total;
  }
  return { selected, total };
}

/** Collapses chains of single-child folders ("src/lib/utils") like GitHub does. */
function compact(node) {
  for (const [key, child] of [...node.dirs]) {
    compact(child);
    if (child.files.length === 0 && child.dirs.size === 1) {
      const [only] = child.dirs.values();
      node.dirs.delete(key);
      node.dirs.set(`${key}/${only.name}`, { ...only, name: `${child.name}/${only.name}` });
    }
  }
  return node;
}

function DirNode({ node, depth, openState, toggle, forceOpen }) {
  const open = forceOpen || openState[node.path] !== false;
  const { selected, total } = countFiles(node);
  const dirs = [...node.dirs.values()].sort((a, b) => a.name.localeCompare(b.name));
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <li>
      {node.path && (
        <button
          type="button"
          onClick={() => toggle(node.path, !open)}
          aria-expanded={open}
          className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[13px] text-fg-muted hover:bg-ink-800 hover:text-fg"
          style={{ paddingLeft: depth * 14 + 6 }}
        >
          <ChevronRight className={cn("size-3.5 shrink-0 text-fg-faint transition-transform", open && "rotate-90")} />
          {open ? <FolderOpen className="size-3.5 shrink-0 text-fg-subtle" /> : <Folder className="size-3.5 shrink-0 text-fg-subtle" />}
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{node.name}</span>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-faint">
            {selected}/{total}
          </span>
        </button>
      )}
      {open && (
        <ul>
          {dirs.map((d) => (
            <DirNode key={d.path} node={d} depth={node.path ? depth + 1 : depth} openState={openState} toggle={toggle} forceOpen={forceOpen} />
          ))}
          {files.map((f) => (
            <li key={f.path}>
              <div
                className={cn("flex items-center gap-2 rounded-md py-1 pr-2 text-[12.5px]", f.selected ? "text-fg" : "text-fg-faint")}
                style={{ paddingLeft: (node.path ? depth + 1 : depth) * 14 + 26 }}
                title={f.path}
              >
                <LangDot language={f.language} className={f.selected ? "" : "opacity-40"} />
                <span className={cn("min-w-0 flex-1 truncate font-mono", !f.selected && "line-through decoration-fg-faint/50")}>{f.name}</span>
                {!f.selected && (
                  <span className="shrink-0 rounded border hairline px-1 font-mono text-[10px] uppercase tracking-wider text-fg-faint">skipped</span>
                )}
                <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-fg-subtle">{formatBytes(f.size)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function FileTree({ files = [], className }) {
  const [filter, setFilter] = useState("");
  const [showSkipped, setShowSkipped] = useState(true);
  const [openState, setOpenState] = useState({});

  const skippedCount = files.filter((f) => !f.selected).length;
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return files.filter((f) => (showSkipped || f.selected) && (!q || f.path.toLowerCase().includes(q)));
  }, [files, filter, showSkipped]);
  const tree = useMemo(() => compact(buildTree(visible)), [visible]);

  return (
    <div className={cn("overflow-hidden rounded-xl border hairline bg-ink-950", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b hairline bg-ink-900 p-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Filter files</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-faint" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files…"
            className="h-8 w-full rounded-lg border hairline bg-ink-950 pl-8 pr-2 font-mono text-[12.5px] outline-none placeholder:text-fg-faint focus:border-signal/40"
          />
        </label>
        {skippedCount > 0 && (
          <button
            type="button"
            role="switch"
            aria-checked={showSkipped}
            onClick={() => setShowSkipped((s) => !s)}
            className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs text-fg-muted hover:bg-ink-800 hover:text-fg"
          >
            <span className={cn("relative h-4 w-7 rounded-full transition-colors", showSkipped ? "bg-signal/80" : "bg-ink-700")}>
              <span className={cn("absolute top-0.5 size-3 rounded-full bg-ink-950 transition-[left]", showSkipped ? "left-3.5" : "left-0.5")} />
            </span>
            Show skipped ({skippedCount})
          </button>
        )}
      </div>
      <div className="scroll-thin max-h-[360px] overflow-y-auto p-1.5">
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-fg-subtle">No files match “{filter}”.</p>
        ) : (
          <ul>
            <DirNode node={tree} depth={0} openState={openState} toggle={(path, open) => setOpenState((s) => ({ ...s, [path]: open }))} forceOpen={Boolean(filter.trim())} />
          </ul>
        )}
      </div>
    </div>
  );
}
