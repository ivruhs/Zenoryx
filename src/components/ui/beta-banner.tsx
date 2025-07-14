"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function BetaBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="sticky top-0 z-100 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 px-4 py-3 dark:border-orange-800 dark:from-orange-900/20 dark:to-yellow-900/20"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              <span className="font-semibold">⚠️ Beta Mode:</span> This app uses
              free-tier LLMs. For best results, avoid large GitHub repos. Some
              rate-limit errors may occur.
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="rounded-lg p-1 text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-800/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
