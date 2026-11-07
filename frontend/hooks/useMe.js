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
    retry: false,
    ...options,
  });
}
