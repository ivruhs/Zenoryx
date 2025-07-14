"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function GitHubTokenInfo() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="ml-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
      >
        <Info className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-full left-1/2 z-50 mb-2 w-80 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                How to generate a GitHub token:
              </h4>
              <ol className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <li>1. Go to github.com/settings/tokens</li>
                <li>{"2. Click Generate new token"}</li>
                <li>{"3. Select scopes like repo and read:org"}</li>
                <li>4. Copy the token and paste it here</li>
              </ol>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-slate-800"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
