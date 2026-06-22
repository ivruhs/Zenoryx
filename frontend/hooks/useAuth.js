// hooks/useAuth.js

/**
 * hook to ask the backend, "who is currently logged in?" on page load
 *
 * useAuth() automatically checks who is logged in using /auth/me, caches the result with TanStack Query, syncs it into Zustand, and gives our frontend a simple { user, isLoading } interface to work with.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";

export function useAuth() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => apiClient.get("/auth/me").then((res) => res.user),
    retry: false, // if it fails, they are not logged in, so don't retry
    staleTime: 5 * 60 * 1000, // consider the session fresh for 5 minutes
  });

  // sync react query server state with our zustand client state
  useEffect(() => {
    if (user) {
      useAuthStore.getState().setUser(user);
    } else if (isError) {
      useAuthStore.getState().clearUser();
    }
  }, [user, isError]);

  return { user, isLoading };
}

/**
Page Loads
    ↓
useAuth()
    ↓
GET /auth/me
    ↓
Backend checks HttpOnly cookie
    ↓
Returns logged-in user
    ↓
React Query caches user
    ↓
Zustand stores user globally
 */
