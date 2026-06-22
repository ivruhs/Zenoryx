// stores/authStore.js

/**
 * Zustand store for authentication state management.
 * This is a small global memory box that remembers:
 * who is logged in?
 * is the user authenticated?
 * has the store loaded from localStorage yet?
 *
 * note: without persist, the store would reset on every page refresh, which is not ideal for auth state.
 *
 * initially, user is null, isAuthenticated is false, and _hasHydrated is false.
 * Note: zenoryx-auth is the key used in localStorage
 *
 * See, we already have httpOnly session cookie for auth. The backend also trusts the cookie not zustand. But if a component say navbar needs to know if the user is logged in, it can check zustand store instead of making a request to the backend. This is faster and more efficient.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist((set) => ({
    user: null,
    isAuthenticated: false,
    _hasHydrated: false,

    setHasHydrated: (state) => set({ _hasHydrated: state }),
    setUser: (user) => set({ user, isAuthenticated: true }),
    clearUser: () => set({ user: null, isAuthenticated: false }),
  })),
  {
    name: "zenoryx-auth",
    skipHydration: true, // crucial for next.js ssr compatibility.
  },
);

/**
 * Global Authentication Memory

Stores:
✅ User Info
✅ Logged In Status

Persists:
✅ Across Refreshes

Handles:
✅ Next.js Hydration Issues

Provides:
✅ Login
✅ Logout
✅ User State
 */
