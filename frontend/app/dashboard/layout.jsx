// app/dashboard/layout.js
"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/stores/authStore";
import { queryKeys } from "@/lib/queryKeys";
import { useEffect, useRef } from "react";
import { toast } from "sonner"; // Shadcn's toast library

// Background watcher component
function GlobalIngestionWatcher() {
  const user = useAuthStore((state) => state.user);
  const prevStatuses = useRef({});

  // Fetch the list of projects every 10 seconds ONLY if there is at least one processing
  useQuery({
    queryKey: queryKeys.projects.list(user?.id),
    queryFn: async () => {
      const projects = await apiClient.get("/projects");

      projects.forEach((p) => {
        const prev = prevStatuses.current[p.id];
        if (prev && prev !== "READY" && p.status === "READY") {
          toast.success(`Repository ${p.repoName} is ready to query!`);
        } else if (prev && prev !== "FAILED" && p.status === "FAILED") {
          toast.error(`Failed to ingest ${p.repoName}.`);
        }
        prevStatuses.current[p.id] = p.status;
      });

      return projects;
    },
    enabled: !!user?.id,
    // 🚨 THE FIX: Only poll if at least one project is actively working
    refetchInterval: (query) => {
      const projects = query.state.data || [];
      const isWorking = projects.some(
        (p) => p.status === "PENDING" || p.status === "PROCESSING",
      );
      return isWorking ? 10000 : false;
    },
  });

  return null; // Invisible component
}

export default function DashboardLayout({ children }) {
  return (
    <AuthGuard>
      <GlobalIngestionWatcher />
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
