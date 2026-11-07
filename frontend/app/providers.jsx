"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

function makeClient() {
  let qc = null;
  // Any 401 means the session expired or was revoked: drop cached data (it may
  // belong to that session) and let the auth gate, which watches ["me"], redirect.
  const onError = (err) => {
    if (err?.status === 401 && qc) {
      qc.clear();
      qc.setQueryData(["me"], null);
    }
  };
  qc = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => count < 2 && (!err?.status || err.status >= 500),
      },
    },
  });
  return qc;
}

export function Providers({ children }) {
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
