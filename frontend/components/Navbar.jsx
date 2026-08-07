// components/Navbar.js
"use client";

import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/stores/chatStore";
import Link from "next/link";
import { Terminal, LogOut } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, clearUser } = useAuthStore();

  const clearAllHistories = useChatStore((state) => state.clearAllHistories);

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post("/auth/logout"),
    onSettled: () => {
      clearUser();
      queryClient.clear();
      clearAllHistories();
      router.push("/login");
    },
  });

  return (
    <nav className="bg-dark-card/90 border-b border-dark-border sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="text-lg font-black tracking-tighter flex items-center gap-2 select-none group"
            >
              <span className="p-1 bg-primary/20 border border-primary/40 rounded-lg text-primary shadow-[1px_1px_0px_0px_#8b5cf6] group-hover:scale-105 transition-transform">
                <Terminal className="w-5 h-5" />
              </span>
              <span className="text-white">
                Zenoryx<span className="text-primary">.</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center gap-2 bg-dark-bg/60 border border-dark-border px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(34,38,63,0.5)]">
                <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                <span className="text-xs font-semibold text-slate-300 hidden sm:inline font-mono">
                  {user.name}
                </span>
              </div>
            )}
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="btn-3d btn-3d-slate text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{logoutMutation.isPending ? "Logging out..." : "Log out"}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
