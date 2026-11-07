"use client";

import { useQuery } from "@tanstack/react-query";
import { api, qk } from "@/lib/api";

/** The signed-in user (server is the source of truth; null when signed out). */
export function useMe(options = {}) {
  return useQuery({
    queryKey: qk.me,
    // Soft endpoint: 200 { user: null } when signed out, so public pages don't log 401s.
    queryFn: async () => (await api.get("/auth/session")).user ?? null,
    staleTime: 5 * 60_000,
    // Retry network errors / 5xx (free-tier cold starts); never retry auth answers.
    retry: (count, err) => count < 3 && (!err?.status || err.status >= 500),
    retryDelay: (n) => Math.min(1500 * 2 ** n, 8000),
    ...options,
  });
}
