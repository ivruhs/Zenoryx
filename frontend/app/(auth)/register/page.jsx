// app/(auth)/register/page.js
"use client";

/**
 * Everything is similar to login page. only difference is that we have an extra name field
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { registerSchema } from "@/lib/schemas";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation({
    mutationFn: (userData) => apiClient.post("/auth/register", userData),
    onSuccess: (data) => {
      // 1. Save new user to Zustand
      useAuthStore.getState().setUser(data.user);
      // 2. Clear any stale caches
      queryClient.clear();
      // 3. Redirect to dashboard
      router.push("/dashboard");
    },
    onError: (error) => {
      // The backend returns a specific error if the email is already taken
      setServerError(error.error || "Registration failed. Please try again.");
    },
  });

  const onSubmit = (data) => {
    setServerError("");
    registerMutation.mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Create an Account
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Join Zenoryx to analyze your codebases.
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
              Full Name
            </label>
            <input
              {...register("name")}
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

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
            disabled={registerMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-70"
          >
            {registerMutation.isPending
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
