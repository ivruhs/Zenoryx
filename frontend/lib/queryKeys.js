// lib/queryKeys.js

/**
 * Note: we shall be using TanStack Query in our project
 * TanStack Query is a smart API data manager that caches server data, keeps it fresh, and saves us from writing tons of useState, useEffect, loading and refetch logic. For our app, the biggest benefits are project status polling and caching project data efficiently.
 *
 *
 * React Query is like a smart cache/storage box. When we fetch data, react query stores it somewehere in memory. But under what name? Thats what queryKeys are for. Query keys are unique identifiers for each piece of data we fetch from the server. We can think of them as unique names for our data in the cache. When we want to refetch or invalidate a piece of data, we use its query key to tell react query which data to update. Its like a label or a tag for our data.
 */

export const queryKeys = {
  auth: {
    me: ["auth", "me"],
  },
  projects: {
    list: (userId) => ["projects", userId],
  },
  project: (projectId) => ({
    status: ["project", projectId, "status"],
    commits: ["project", projectId, "commits"],
  }),
};
