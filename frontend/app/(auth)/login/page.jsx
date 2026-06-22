// app/(auth)/login/page.jsx

/**
 * This page is the entire login workflow of our Zenoryx application.
 * When a user enters email+password and clicks sign in, this page:
User enters email/password
          ↓
React Hook Form collects values
          ↓
Zod validates values
          ↓
handleSubmit()
          ↓
onSubmit()
          ↓
useMutation()
          ↓
POST /auth/login
          ↓
Backend verifies credentials
          ↓
Creates session cookie
          ↓
Returns user
          ↓
Zustand setUser()
          ↓
React Query cache cleared
          ↓
router.push('/dashboard')
          ↓
Dashboard Opens

Note: useMutation is used for post,put,delete operations. Login is a POST request, so we use useMutation. For fetching data (GET requests), we would use useQuery.

 */

"use client";

// import { useForm } from "react-form"; // Note: React Hook Form implementation
import { useForm as useReactHookForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { loginSchema } from "@/lib/schemas";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  // react hook form + zod validation setup
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useReactHookForm({
    resolver: zodResolver(loginSchema),
  });

  // this is the heart of the login flow - the mutation that sends credentials to backend and handles response. On success, it saves user to Zustand, clears cache, and redirects. On error, it shows error message.
  const loginMutation = useMutation({
    mutationFn: (credentials) => apiClient.post("/auth/login", credentials),
    onSuccess: (data) => {
      // 1. Save user to Zustand
      useAuthStore.getState().setUser(data.user);
      // 2. Clear any stale caches (just to be safe)
      queryClient.clear();
      // 3. Redirect to dashboard
      router.push("/dashboard");
    },
    onError: (error) => {
      setServerError(error.error || "Invalid email or password.");
    },
  });

  // upon form submission, we clear any previous server errors and trigger the login mutation with form data. The mutation's onSuccess and onError handlers will take care of the rest.
  const onSubmit = (data) => {
    setServerError("");
    loginMutation.mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to Zenoryx
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Sign in to query your repositories.
          </p>
        </div>

        {serverError && (
          <div className="mb-4 p-3 bg-pastel-red/20 border border-pastel-red text-red-700 text-sm rounded-lg">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-70"
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="text-primary hover:underline font-medium"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
