"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eraser, ExternalLink, FileCode2, FolderTree, MessageSquare, PanelRight, Scissors, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import { cn, formatCount } from "@/lib/format";
import { LanguageBar, LangDot } from "@/components/ui/LanguageBar";
import { Explorer } from "./Explorer";
import { ChatThread, toExchanges } from "./ChatThread";
import { SourcesPanel } from "./SourcesPanel";
import { FileInspector } from "./FileInspector";
import { useConversation, useFiles } from "./hooks";

/** Two-step destructive button: first click arms, second confirms. */
function ArmedButton({ onConfirm, children, armedLabel, className, disabled }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
      className={cn(className, armed && "!bg-pink-soft !text-pink-deep ring-[1.5px] ring-pink-deep")}
    >
      {armed ? armedLabel : children}
    </button>
  );
}

function Drawer({ side, open, onClose, children, label }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <div className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-ink/30 backdrop-blur-[2px] transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside
        aria-label={label}
        className={cn(
          "absolute top-0 flex h-full w-[min(88vw,400px)] flex-col border-ink bg-paper-2 transition-transform duration-300 ease-out",
          side === "left" ? "left-0 border-r-[1.5px]" : "right-0 border-l-[1.5px] bg-paper",
          open ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full",
        )}
      >
        <button type="button" onClick={onClose} className="icon-btn absolute right-2 top-2 z-10" aria-label="Close panel">
          <X className="size-4" />
        </button>
        {children}
      </aside>
    </div>
  );
}

export function Workspace({ project }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const conversation = useConversation(project.id);
  const { data: files = [] } = useFiles(project.id, true);

  const [tabs, setTabs] = useState([]); // open file paths
  const [active, setActive] = useState("chat"); // "chat" | path
  const [focusLine, setFocusLine] = useState(null);
  const [focus, setFocus] = useState({ messageId: null, cite: null });
  const [drawer, setDrawer] = useState(null); // "files" | "sources" | null
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const exchanges = useMemo(() => toExchanges(conversation.messages), [conversation.messages]);
  const live = conversation.live;

  // The sources panel follows the live answer, otherwise the focused/latest one.
  const focusedExchange = useMemo(() => {
    if (live && (!focus.messageId || focus.messageId === live.id)) return live;
    return exchanges.find((e) => e.id === focus.messageId) || exchanges.at(-1) || null;
  }, [live, exchanges, focus.messageId]);

  useEffect(() => {
    if (live?.id) setFocus({ messageId: live.id, cite: null });
  }, [live?.id]);
  // When a live answer is persisted, move focus to its stored counterpart.
  const lastId = exchanges.at(-1)?.id;
  useEffect(() => {
    if (!live && lastId) setFocus((f) => (f.messageId?.startsWith?.("live-") ? { messageId: lastId, cite: f.cite } : f));
  }, [live, lastId]);

  const citedPaths = useMemo(() => new Set((focusedExchange?.sources || []).map((s) => s.filePath)), [focusedExchange]);

  const openFile = useCallback((path, line = null) => {
    setTabs((t) => (t.includes(path) ? t : [...t.slice(-5), path]));
    setActive(path);
    setFocusLine(line);
    setDrawer(null);
  }, []);
  const closeTab = (path) => {
    setTabs((t) => t.filter((p) => p !== path));
    if (active === path) setActive("chat");
  };

  const onCite = (messageId, n) => {
    setFocus({ messageId, cite: n });
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1279px)").matches) setDrawer("sources");
  };

  const askFromAnywhere = (q) => {
    setActive("chat");
    conversation.ask(q);
  };

  const remove = useMutation({
    mutationFn: () => api.del(`/projects/${project.id}`),
    onSuccess: () => {
      queryClient.setQueryData(qk.projects, (old) => old?.filter((p) => p.id !== project.id));
      toast("Repository deleted", { description: "Vectors, commits and chat history were removed." });
      router.replace("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setActive("chat");
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const explorer = <Explorer project={project} openFile={(p) => openFile(p)} activePath={active !== "chat" ? active : null} citedPaths={citedPaths} />;
  const sources = (
    <SourcesPanel
      exchange={focusedExchange}
      activeCite={focus.messageId === focusedExchange?.id ? focus.cite : null}
      project={project}
      onOpenInFile={(s) => openFile(s.filePath, s.startLine)}
    />
  );
  const fileLang = (p) => files.find((f) => f.path === p)?.language;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col">
      {/* Repository bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b-[1.5px] border-ink bg-paper-2 px-3 sm:px-4">
        <Link href="/dashboard" className="icon-btn" aria-label="Back to repositories">
          <ArrowLeft className="size-4" />
        </Link>
        <button type="button" className="icon-btn lg:hidden" onClick={() => setDrawer("files")} aria-label="Open file explorer">
          <FolderTree className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold tracking-[-0.025em]">
            <span className="font-medium text-ink-3">{project.repoOwner}/</span>
            {project.repoName}
          </h1>
        </div>
        <div className="hidden items-center gap-4 font-mono text-[11px] text-ink-2 md:flex">
          {project.stars != null && (
            <span className="flex items-center gap-1">
              <Star className="size-3 fill-yellow" />
              {formatCount(project.stars)}
            </span>
          )}
          <span>{project.fileCount} files</span>
          <span className="flex items-center gap-1">
            <Scissors className="size-3" />
            {formatCount(project.chunkCount)} clippings
          </span>
          {Array.isArray(project.languages) && <LanguageBar languages={project.languages} className="w-24" />}
        </div>
        <div className="flex items-center gap-0.5">
          <a href={project.repoUrl} target="_blank" rel="noreferrer" className="icon-btn" aria-label="Open on GitHub" title="Open on GitHub">
            <ExternalLink className="size-4" />
          </a>
          {conversation.messages.length > 0 && (
            <ArmedButton
              className="icon-btn w-auto px-2 text-xs"
              armedLabel={<span className="flex items-center gap-1.5 px-1"><Eraser className="size-3.5" /> Clear chat?</span>}
              onConfirm={() => conversation.clear().then(() => toast("Conversation cleared")).catch((e) => toast.error(e.message))}
              disabled={conversation.busy}
            >
              <span title="Clear conversation"><Eraser className="size-4" /></span>
            </ArmedButton>
          )}
          <ArmedButton
            className="icon-btn w-auto px-2 text-xs"
            armedLabel={<span className="flex items-center gap-1.5 px-1"><Trash2 className="size-3.5" /> Delete repo?</span>}
            onConfirm={() => remove.mutate()}
            disabled={remove.isPending}
          >
            <span title="Delete repository"><Trash2 className="size-4" /></span>
          </ArmedButton>
          <button type="button" className="icon-btn xl:hidden" onClick={() => setDrawer("sources")} aria-label="Open sources">
            <PanelRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_380px]">
        <aside className="hidden min-h-0 border-r-[1.5px] border-ink bg-paper-2 lg:flex lg:flex-col" aria-label="Explorer">
          {explorer}
        </aside>

        <section className="flex min-h-0 flex-col" aria-label="Workspace">
          {tabs.length > 0 && (
            <div className="scroll-thin flex h-11 shrink-0 items-end gap-1 overflow-x-auto border-b-[1.5px] border-ink px-3" role="tablist">
              {[{ id: "chat" }, ...tabs.map((p) => ({ id: p }))].map((t) => {
                const isChat = t.id === "chat";
                const selected = active === t.id;
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "group relative z-10 -mb-[1.5px] flex h-9 shrink-0 items-center gap-2 rounded-t-xl border-[1.5px] border-b-0 px-3 text-[13px]",
                      selected ? "border-ink bg-paper font-semibold text-ink" : "border-transparent text-ink-3 hover:text-ink",
                    )}
                  >
                    <button type="button" role="tab" aria-selected={selected} onClick={() => setActive(t.id)} className="flex items-center gap-2">
                      {isChat ? <MessageSquare className="size-3.5" /> : <LangDot language={fileLang(t.id)} />}
                      <span className={cn(!isChat && "font-mono")}>{isChat ? "Ask" : t.id.split("/").pop()}</span>
                    </button>
                    {!isChat && (
                      <button type="button" onClick={() => closeTab(t.id)} className="rounded-full p-0.5 text-ink-4 hover:bg-pink-soft hover:text-pink-deep" aria-label={`Close ${t.id}`}>
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="min-h-0 flex-1">
            <div className={cn("h-full", active !== "chat" && "hidden")}>
              <ChatThread
                project={project}
                conversation={conversation}
                focus={focus}
                onCite={onCite}
                inputRef={inputRef}
                draft={draft}
                setDraft={setDraft}
              />
            </div>
            {active !== "chat" && (
              <FileInspector key={active} project={project} path={active} focusLine={focusLine} onAsk={askFromAnywhere} />
            )}
          </div>
        </section>

        <aside className="hidden min-h-0 border-l-[1.5px] border-ink bg-paper xl:flex xl:flex-col" aria-label="Sources">
          {sources}
        </aside>
      </div>

      <Drawer side="left" open={drawer === "files"} onClose={() => setDrawer(null)} label="File explorer">
        <div className="flex items-center gap-2 px-4 pt-4 font-mono text-xs text-ink-3">
          <FileCode2 className="size-3.5" /> {project.repoName}
        </div>
        {explorer}
      </Drawer>
      <Drawer side="right" open={drawer === "sources"} onClose={() => setDrawer(null)} label="Sources">
        {sources}
      </Drawer>
    </div>
  );
}
