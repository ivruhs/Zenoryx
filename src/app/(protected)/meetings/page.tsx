"use client";

import { UploadCloud, Mic, Sparkles } from "lucide-react";

export default function MeetingComingSoon() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-sky-100 to-white px-6 py-12 dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a]">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/60 px-4 py-1 text-sm font-medium text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          <Mic className="h-4 w-4" />
          Meeting Audio Summaries
        </div>

        <h1 className="animate-fade-up text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
          Upload. Listen. Summarize.
        </h1>

        <p className="animate-fade-up animate-delay-100 mx-auto max-w-xl text-lg text-slate-600 sm:text-xl dark:text-slate-300">
          Soon, {`you'll`} be able to upload MP3 meeting recordings and get
          clear, concise summaries powered by AssemblyAI — in seconds.
        </p>

        <div className="animate-fade-up animate-delay-200 flex justify-center">
          <div className="rounded-2xl border border-indigo-300 bg-white px-6 py-4 shadow-xl dark:border-indigo-700 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <UploadCloud className="h-6 w-6 animate-pulse text-indigo-500 dark:text-indigo-400" />
              <span className="text-base font-semibold text-indigo-700 sm:text-lg dark:text-indigo-300">
                Audio Upload + AI Summary = Magic
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 text-xs text-slate-400 dark:text-slate-600">
          This feature is brewing in our AI lab. No ETA yet — stay tuned! ✨
        </div>
      </div>
    </main>
  );
}
