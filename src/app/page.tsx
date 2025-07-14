import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Github,
  Zap,
  Star,
  Code,
  Users,
  VectorSquare,
  SearchCode,
} from "lucide-react";

export default async function Home() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200/50 bg-white/80 backdrop-blur-lg dark:border-slate-700/50 dark:bg-slate-800/80">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-2">
                <SearchCode className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
                Zenoryx
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="relative overflow-hidden rounded-2xl border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <span className="z-10">Get Started</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-6xl space-y-16">
            {/* Hero Section */}
            <div className="space-y-8 text-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    AI-Powered Code Assistant
                  </span>
                </div>
                <h1 className="bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-6xl leading-tight font-bold text-transparent lg:text-8xl dark:from-slate-100 dark:via-blue-300 dark:to-purple-300">
                  Zenoryx
                </h1>
                <p className="mx-auto max-w-3xl text-xl leading-relaxed text-slate-600 lg:text-2xl dark:text-slate-400">
                  Intelligent code analysis and project management platform that
                  understands your codebase like never before
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="hover:shadow-3xl h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 text-lg font-semibold text-white shadow-2xl transition-all duration-300 hover:from-blue-700 hover:to-purple-700"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                {/* <Button
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-2xl border-slate-300 bg-transparent px-8 text-lg font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  <Github className="mr-2 h-5 w-5" />
                  View Demo
                </Button> */}
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="group rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Github className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  🔗 GitHub Integration
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                  Seamlessly connect your repositories and get instant insights
                  into your codebase with intelligent analysis
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  🤖 AI-Powered Q&A
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                  Ask questions about your code and get intelligent, contextual
                  answers powered by advanced AI models
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  🧠 Codebase Intelligence
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                  Gain a deep understanding of your code structure,
                  dependencies, and file-level logic — distilled into concise
                  summaries.
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <VectorSquare className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  🧬 Semantic Search with Vector Embeddings
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                  Leverage powerful vector embeddings and RAG to enable
                  lightning-fast, context-aware retrieval of relevant code
                  summaries, commit history, and technical insights — all
                  grounded in your actual codebase.
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  👥 Team Collaboration
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                  Invite team members, share insights, and collaborate on
                  projects with seamless integration
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  💡 Smart Insights
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                  Get clear, AI-powered summaries of your latest 10 commits to
                  quickly understand project changes and intent.{" "}
                </p>
              </div>
            </div>

            {/* Final CTA */}
            <div className="space-y-8 py-16 text-center">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-slate-900 lg:text-5xl dark:text-slate-100">
                  Ready to transform your development workflow?
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                  Join thousands of developers who are already using Zenoryx to
                  understand and improve their codebases
                </p>
              </div>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="hover:shadow-3xl h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-12 text-xl font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-purple-700"
                >
                  Start Your Journey
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
