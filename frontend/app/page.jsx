// app/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Globe, Code2, Zap, Lock, Terminal } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Redirect instantly if they are already logged in
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated) return null;

  return (
    <div className="min-h-screen bg-dark-bg text-[#e2e8f0] flex flex-col font-sans selection:bg-primary/30 selection:text-white relative overflow-hidden">
      
      {/* Decorative Floating Glowing Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/15 blur-[150px] pointer-events-none"></div>

      {/* Cyber Grid Overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none [background-size:40px_40px] opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, #22263f 1px, transparent 1px), linear-gradient(to bottom, #22263f 1px, transparent 1px)",
        }}
      ></div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center max-w-7xl w-full mx-auto px-6 py-6 border-b border-dark-border/40 backdrop-blur-md">
        <div className="text-2xl font-black tracking-tighter flex items-center gap-2 select-none">
          <span className="p-1.5 bg-primary/20 border border-primary/40 rounded-lg text-primary shadow-[2px_2px_0px_0px_#8b5cf6]">
            <Terminal className="w-6 h-6" />
          </span>
          <span>Zenoryx<span className="text-primary">.</span></span>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-400 hover:text-white px-4 py-2.5 transition-colors border border-transparent hover:border-dark-border rounded-xl"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="btn-3d btn-3d-primary text-sm px-5 py-2.5"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-16 md:py-24">
        
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          {/* Tag */}
          <div className="inline-flex items-center gap-2 bg-[#8b5cf6]/10 text-primary border border-primary/30 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-8 shadow-[2px_2px_0px_0px_rgba(139,92,246,0.15)]">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>AI-Powered Code Assistant</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-[1.1] mb-8 select-none">
            Chat with your <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-[#c084fc] drop-shadow-[0_2px_10px_rgba(139,92,246,0.2)]">
              GitHub Repositories.
            </span>
          </h1>

          {/* Description */}
          <p className="text-base md:text-lg text-slate-400 mb-12 max-w-2xl leading-relaxed">
            Stop digging through folders to figure out how a codebase works.
            Zenoryx leverages semantic AST parsing and vector embeddings to give you
            instant architectural answers.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="btn-3d btn-3d-primary text-base px-8 py-3.5 flex items-center gap-3 w-full sm:w-auto"
            >
              <Globe className="w-5 h-5" />
              Connect a Repository
              <span>&rarr;</span>
            </Link>
            <Link
              href="/login"
              className="btn-3d btn-3d-slate text-base px-8 py-3.5 w-full sm:w-auto text-center"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full mt-24 relative z-10">
          
          <div className="card-3d p-6 text-left flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mb-5 text-primary shadow-[2px_2px_0px_0px_rgba(139,92,246,0.2)]">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Deep AST Chunking
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                We parse the abstract syntax tree to keep complete classes and functions intact, ensuring the AI retrieves clean, context-rich snippets.
              </p>
            </div>
          </div>

          <div className="card-3d p-6 text-left flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 bg-secondary/10 border border-secondary/20 rounded-xl flex items-center justify-center mb-5 text-secondary shadow-[2px_2px_0px_0px_rgba(20,184,166,0.2)]">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Real-Time SSE
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                No delays or pagination. Code insights and answers stream directly to your screen token-by-token over HTTP Server-Sent Events.
              </p>
            </div>
          </div>

          <div className="card-3d p-6 text-left flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center mb-5 text-accent shadow-[2px_2px_0px_0px_rgba(245,158,11,0.2)]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Secure Sessions
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sessions are backed by Postgres and signed on the server using HMAC-SHA256 HttpOnly cookies. No vulnerabilities, no exceptions.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-border/40 py-8 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Zenoryx. Crafted for codebase comprehension.
      </footer>
    </div>
  );
}
