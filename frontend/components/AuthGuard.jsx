// components/AuthGuard.jsx

/**
 * We need a wrapper component that we can wrap around our /dashboard and /projects routes. If someone tries to visit those URLs without a session, this component will instantly redirect them back to the login page.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";

export function AuthGuard({ children }) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // fire the session check hook in the background
  const { isLoading } = useAuth();

  // wait until zustand has hydrated from localstorage to avoid a flash of redirects
  useEffect(() => {
    if (!isLoading && _hasHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, _hasHydrated, isAuthenticated, router]);

  // show nothing (or a full-screen spinner) while we verify identity

  if (!_hasHydrated || (!isAuthenticated && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-pastel-blue border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // If authenticated, render the dashboard!
  return isAuthenticated ? children : null;
}

/**
User enters protected page
        ↓
Checks cookie via /auth/me
        ↓
Waits for Zustand hydration
        ↓
Logged in?
   ├─ Yes → Show page
   └─ No  → Redirect to /login
 */
