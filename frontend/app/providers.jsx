// app/providers.jsx

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export function Providers({ children }) {
  // lazy initialization of QueryClient to avoid creating a new instance on every render as that will cause old cached data to be lost and refetched
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1, // Retry failed requests once
          },
        },
      }),
  );

  // since we explicitly blocked authStore from auto-hydrating to save Next.js from crashing, we need to manually trigger it once the app boots up in the browser.

  useEffect(() => {
    useAuthStore.persist.rehydrate();
    useAuthStore.getState().setHasHydrated(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
