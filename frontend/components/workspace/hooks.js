"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, qk } from "@/lib/api";
import { streamSSE } from "@/lib/sse";
import { isActive } from "@/lib/pipeline";

/** Project details; polls every 1.5s while ingestion is running. */
export function useProject(id) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: qk.project(id),
    queryFn: () => api.get(`/projects/${id}`),
    refetchInterval: (q) => (isActive(q.state.data?.status) ? 1500 : false),
    retry: (count, err) => err?.status !== 404 && count < 2,
  });
  const status = query.data?.status;
  const prev = useRef(status);
  useEffect(() => {
    // Keep the dashboard list fresh when this project's state flips.
    if (prev.current && prev.current !== status) queryClient.invalidateQueries({ queryKey: qk.projects });
    prev.current = status;
  }, [status, queryClient]);
  return query;
}

export function useFiles(id, enabled) {
  return useQuery({ queryKey: qk.files(id), queryFn: () => api.get(`/projects/${id}/files`), enabled, staleTime: Infinity });
}

export function useCommits(id, enabled) {
  return useQuery({ queryKey: qk.commits(id), queryFn: () => api.get(`/projects/${id}/commits`), enabled, staleTime: Infinity });
}

export function useFileChunks(id, path) {
  return useQuery({
    queryKey: qk.chunks(id, path),
    queryFn: () => api.get(`/projects/${id}/chunks?path=${encodeURIComponent(path)}`),
    enabled: Boolean(path),
    staleTime: Infinity,
  });
}

/**
 * Conversation state: persisted history from the API + one live exchange that
 * streams over SSE. Phases: retrieving → streaming → (done | error | stopped).
 */
export function useConversation(projectId) {
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: qk.messages(projectId),
    queryFn: () => api.get(`/projects/${projectId}/messages`),
    staleTime: Infinity,
  });
  const [live, setLive] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (question) => {
      const q = question.trim();
      if (!q || abortRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;
      const started = performance.now();
      const id = `live-${Date.now()}`;
      setLive({ id, question: q, answer: "", sources: [], phase: "retrieving", startedAt: started });

      let answer = "";
      let sources = [];
      let pending = "";
      let raf = 0;
      const flush = () => {
        raf = 0;
        if (!pending) return;
        answer += pending;
        pending = "";
        setLive((l) => (l && l.id === id ? { ...l, answer, phase: "streaming" } : l));
      };

      try {
        await streamSSE(
          "/api/qa",
          { projectId, question: q },
          {
            signal: controller.signal,
            onEvent: (e) => {
              if (e.type === "sources") {
                sources = e.sources;
                setLive((l) => (l && l.id === id ? { ...l, sources: e.sources, phase: "generating", firstSourceMs: performance.now() - started } : l));
              } else if (e.type === "token") {
                // Batch tokens per animation frame so long answers stay smooth.
                pending += e.token;
                if (!raf) raf = requestAnimationFrame(flush);
              } else if (e.type === "done") {
                if (raf) cancelAnimationFrame(raf);
                flush();
                const now = new Date().toISOString();
                queryClient.setQueryData(qk.messages(projectId), (old = []) => [
                  ...old,
                  { id: `${e.messageId}-q`, role: "user", content: q, createdAt: now },
                  { id: e.messageId, role: "assistant", content: answer, sources, latencyMs: e.latencyMs, provider: e.provider, model: e.model, createdAt: now },
                ]);
                setLive((l) => (l && l.id === id ? null : l));
              } else if (e.type === "error") {
                throw Object.assign(new Error(e.error), { fromServer: true });
              }
            },
          },
        );
      } catch (err) {
        if (raf) cancelAnimationFrame(raf);
        flush();
        const stopped = err.name === "AbortError";
        setLive((l) =>
          l && l.id === id
            ? { ...l, answer, phase: stopped ? "stopped" : "error", error: stopped ? null : err.message || "Something went wrong." }
            : l,
        );
      } finally {
        abortRef.current = null;
      }
    },
    [projectId, queryClient],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const clear = useCallback(async () => {
    await api.del(`/projects/${projectId}/messages`);
    setLive(null);
    queryClient.setQueryData(qk.messages(projectId), []);
  }, [projectId, queryClient]);

  const messages = history.data || [];
  const busy = Boolean(live && ["retrieving", "generating", "streaming"].includes(live.phase));
  return { messages, history, live, ask, stop, clear, busy, dismissLive: () => setLive(null) };
}
