// hooks/useProjectStatus.js

/**
 * The job of this hook is to keep checking project status every few seconds until ingestion finishes.
 * 
 * User adds repository
        │
        ▼
Backend starts processing
        │
        ▼
Status = PROCESSING
        │
        ▼
Frontend checks every 3 seconds
        │
        ▼
READY ?
        │
      No
        │
        ▼
Check again
        │
        ▼
READY ?
        │
      Yes
        │
        ▼
Stop polling
        │
        ▼
Refresh dashboard cache

This hook continuously polls the backend every 3 seconds for a repository's ingestion status, automatically stops when ingestion completes or fails, and refreshes the dashboard cache so repository badges stay up to date across the app. 🚀
 * 
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";

export function useProjectStatus(projectId) {
  // queryClient is like the cache manager. we can update,delete,refresh,invalidate cache.
  const queryClient = useQueryClient();
  //get currrent user id from Zustand store
  const userId = useAuthStore((state) => state.user?.id);

  const query = useQuery({
    queryKey: queryKeys.project(projectId).status,
    queryFn: () => apiClient.get(`/projects/${projectId}/status`),
    // The magic polling function: Stop polling if READY or FAILED
    refetchInterval: (data) => {
      const status = data?.state?.data?.status;
      if (status === "READY" || status === "FAILED") {
        return false;
      }
      return 3000; // Poll every 3 seconds otherwise
    },
  });

  // Pitfall Fix: When it finishes, quietly update the dashboard cache
  // so the user sees the green badge if they navigate back.
  /**
   * Backend finished
        │
        ▼
    Status hook notices
        │
        ▼
    Invalidate dashboard cache
        │
        ▼
    Dashboard refetches
        │
        ▼
    READY badge appears automatically
   */
  useEffect(() => {
    const status = query.data?.status;
    if (status === "READY" || status === "FAILED") {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.list(userId),
      });
    }
  }, [query.data?.status, queryClient, userId]);

  return query;
}
