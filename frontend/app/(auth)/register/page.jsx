// app/(auth)/register/page.js
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { registerSchema } from "@/lib/schemas";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Terminal, User, Mail, Key } from "lucide-react";

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
      useAuthStore.getState().setUser(data.user);
      queryClient.clear();
      router.push("/dashboard");
    },
    onError: (error) => {
      setServerError(error.error || "Registration failed. Please try again.");
    },
  });

  const onSubmit = (data) => {
    setServerError("");
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-[#e2e8f0] flex items-center justify-center px-4 relative overflow-hidden font-sans">
      
      {/* Background Glowing Blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo and Greeting */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-black tracking-tighter select-none mb-3">
            <span className="p-1.5 bg-primary/20 border border-primary/40 rounded-lg text-primary shadow-[2px_2px_0px_0px_#8b5cf6]">
              <Terminal className="w-6 h-6" />
            </span>
            <span>Zenoryx<span className="text-primary">.</span></span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Create an Account</h2>
          <p className="text-xs text-slate-400 mt-1">Join Zenoryx to start analyzing codebases with AI.</p>
        </div>

        {/* 3D Glass Form Card */}
        <div className="card-3d p-8 shadow-[6px_6px_0px_0px_#1e2238] bg-dark-card border-dark-border">
          {serverError && (
            <div className="mb-5 p-3.5 bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent" />
                <span>Full Name</span>
              </label>
              <input
                {...register("name")}
                type="text"
                className="w-full px-4 py-3 input-3d text-sm font-mono"
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="text-danger text-xs mt-1.5 font-mono">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>Email Address</span>
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full px-4 py-3 input-3d text-sm font-mono"
                placeholder="name@example.com"
              />
              {errors.email && (
                <p className="text-danger text-xs mt-1.5 font-mono">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-secondary" />
                <span>Password</span>
              </label>
              <input
                {...register("password")}
                type="password"
                className="w-full px-4 py-3 input-3d text-sm font-mono"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-danger text-xs mt-1.5 font-mono">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full btn-3d btn-3d-primary py-3 text-sm"
            >
              {registerMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Redirect link */}
          <div className="text-center text-xs text-slate-400 mt-6 pt-6 border-t border-dark-border/40">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-hover font-bold hover:underline transition-colors ml-1"
            >
              Sign in
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
