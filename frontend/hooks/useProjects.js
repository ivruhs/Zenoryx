"use client";

import { useQuery } from "@tanstack/react-query";
import { api, qk } from "@/lib/api";
import { isActive } from "@/lib/pipeline";

/** All projects; polls every 2.5s only while something is indexing. */
export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: () => api.get("/projects"),
    refetchInterval: (q) => ((q.state.data || []).some((p) => isActive(p.status)) ? 2500 : false),
  });
}
