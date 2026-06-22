// components/Navbar.js
"use client";

/**
 * This Navbar component is our application's top navigation bar that handles:

🏷️ Showing the Zenoryx logo
👤 Showing the logged-in user's name
🚪 Logging the user out
🔄 Clearing all cached/authenticated state after logout

User clicks "Log out"
        │
        ▼
POST /auth/logout
        │
        ▼
Clear Zustand auth store
        │
        ▼
Clear React Query cache
        │
        ▼
Redirect to /login

Navbar
 │
 ├── Zustand
 │     └── user info
 │
 ├── React Query
 │     └── cache management
 │
 ├── API Client
 │     └── POST /auth/logout
 │
 └── Next Router
       └── redirect to /login

 */

import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/stores/chatStore";
import Link from "next/link";

export function Navbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, clearUser } = useAuthStore();

  // Bring in the wipe function
  const clearAllHistories = useChatStore((state) => state.clearAllHistories);

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post("/auth/logout"),
    onSettled: () => {
      // Regardless of whether the server succeeds or fails, wipe local state
      clearUser();
      queryClient.clear();
      clearAllHistories(); // Destroy session storage chat logs
      router.push("/login");
    },
  });

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-slate-900 tracking-tight"
            >
              Zenoryx<span className="text-primary">.</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-600 hidden sm:block">
              {user?.name}
            </span>
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              {logoutMutation.isPending ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
