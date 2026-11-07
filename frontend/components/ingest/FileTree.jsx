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
          className="flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[13px] text-ink-2 hover:bg-paper-3 hover:text-ink"
          style={{ paddingLeft: depth * 14 + 6 }}
        >
          <ChevronRight className={cn("size-3.5 shrink-0 text-ink-3 transition-transform", open && "rotate-90")} />
          {open ? <FolderOpen className="size-4 shrink-0 fill-yellow text-ink" /> : <Folder className="size-4 shrink-0 fill-yellow text-ink" />}
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] font-bold">{node.name}</span>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-3">
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
                className={cn("flex items-center gap-2 rounded-lg py-1 pr-2 text-[12.5px]", f.selected ? "text-ink" : "text-ink-4")}
                style={{ paddingLeft: (node.path ? depth + 1 : depth) * 14 + 26 }}
                title={f.path}
              >
                <LangDot language={f.language} className={f.selected ? "" : "opacity-35"} />
                <span className={cn("min-w-0 flex-1 truncate font-mono", !f.selected && "line-through decoration-pink-deep/60 decoration-[1.5px]")}>{f.name}</span>
                {!f.selected && (
                  <span className="stamp shrink-0 !px-1 !py-0 !text-[9px] !tracking-[0.08em]" style={{ "--stamp": "var(--color-pink-deep)", "--r": "-3deg" }}>
                    skipped
                  </span>
                )}
                <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-3">{formatBytes(f.size)}</span>
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
    <div className={cn("overflow-hidden rounded-xl border-[1.5px] border-ink bg-paper-2", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b-[1.5px] border-dashed border-ink/25 bg-paper p-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Filter files</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files…"
            className="h-9 w-full rounded-full border-[1.5px] border-ink/25 bg-paper-2 pl-8 pr-3 font-mono text-[12.5px] text-ink outline-none placeholder:text-ink-4 focus:border-blue"
          />
        </label>
        {skippedCount > 0 && (
          <button
            type="button"
            role="switch"
            aria-checked={showSkipped}
            onClick={() => setShowSkipped((s) => !s)}
            className="flex h-9 items-center gap-2 rounded-full px-3 text-xs text-ink-2 hover:bg-paper-3 hover:text-ink"
          >
            <span className={cn("relative h-[18px] w-8 rounded-full border-[1.5px] border-ink transition-colors", showSkipped ? "bg-pink" : "bg-paper-3")}>
              <span className={cn("absolute top-[1.5px] size-3 rounded-full border border-ink bg-paper-2 transition-[left] duration-200", showSkipped ? "left-[15px]" : "left-[1.5px]")} />
            </span>
            Show skipped ({skippedCount})
          </button>
        )}
      </div>
      <div className="scroll-thin max-h-[360px] overflow-y-auto p-1.5">
        {visible.length === 0 ? (
          <p className="hand px-3 py-8 text-center text-xl text-ink-3">no files match “{filter}”</p>
        ) : (
          <ul>
            <DirNode node={tree} depth={0} openState={openState} toggle={(path, open) => setOpenState((s) => ({ ...s, [path]: open }))} forceOpen={Boolean(filter.trim())} />
          </ul>
        )}
      </div>
    </div>
  );
}
