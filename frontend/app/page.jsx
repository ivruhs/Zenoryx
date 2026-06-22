// app/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Globe, Code2, Zap, Lock } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Redirect instantly if they are already logged in
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Don't flash the landing page if we are still figuring out their auth status
  if (!_hasHydrated) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-pastel-blue selection:text-primary">
      {/* Navigation */}
      <nav className="flex justify-between items-center max-w-7xl w-full mx-auto px-6 py-6 relative z-10">
        <div className="text-2xl font-black text-slate-900 tracking-tighter">
          Zenoryx<span className="text-primary">.</span>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-5 py-2 rounded-full shadow-sm transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 -mt-10">
        {/* Cinematic Grid Background */}
        <div
          className="absolute inset-0 z-0 pointer-events-none [background-size:32px_32px] opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          }}
        ></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-pastel-purple/20 text-purple-700 border border-pastel-purple/50 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-8">
            <Zap className="w-3.5 h-3.5" />
            <span>AI-Powered Code Assistant</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
            Chat with your <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              GitHub Repositories.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl leading-relaxed">
            Stop digging through thousands of files to understand a codebase.
            Zenoryx analyzes your architecture, summarizes commits, and lets you
            ask questions in plain English.
          </p>

          <Link
            href="/register"
            className="group bg-slate-900 hover:bg-slate-800 text-white text-lg font-medium px-8 py-4 rounded-full shadow-lg transition-all flex items-center gap-3 hover:-translate-y-0.5"
          >
            <Globe className="w-5 h-5" />
            Connect a Repository
            <span className="text-slate-400 group-hover:translate-x-1 transition-transform">
              &rarr;
            </span>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full mt-24 relative z-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
            <div className="w-10 h-10 bg-pastel-blue/30 rounded-lg flex items-center justify-center mb-4">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Deep AST Chunking
            </h3>
            <p className="text-sm text-slate-500">
              We don't just split text. We parse the abstract syntax tree to
              keep your functions perfectly intact for maximum AI context.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
            <div className="w-10 h-10 bg-pastel-amber/30 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Real-Time SSE
            </h3>
            <p className="text-sm text-slate-500">
              Answers stream in character-by-character powered by Groq's
              ultra-fast Llama3 inference engine.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
            <div className="w-10 h-10 bg-pastel-green/30 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Ironclad Security
            </h3>
            <p className="text-sm text-slate-500">
              Your session is protected by HMAC-signed HttpOnly cookies. We
              never expose your token to JavaScript.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
