"use client";
import { api } from "../../../trpc/react";
import { Info, CreditCard, Zap, Star } from "lucide-react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

const BillingPage = () => {
  const { data: user } = api.project.getMyCredits.useQuery();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:border-slate-700 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-3">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Billing & Credits
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage your credits and billing information
            </p>
          </div>
        </div>
      </div>

      {/* Credits Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600">
            <Zap className="h-8 w-8 text-white" />
          </div>

          <h2 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            {user?.credits || 0}
          </h2>

          <div className="flex items-center justify-center gap-1 text-lg text-slate-600 dark:text-slate-400">
            <span>Credits Available</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-pointer text-blue-500 hover:text-blue-700">
                    <Info className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="border border-blue-300 bg-blue-100 text-blue-800 shadow-md"
                >
                  Only 50 credits by default
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 dark:border-blue-800 dark:from-blue-900/20 dark:to-blue-800/20"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-blue-600 p-2">
            <Info className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              How Credits Work
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Each credit allows you to index 1 file in a repository.
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              For example: If your project has 100 files, you will need 100
              credits to index it completely.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Coming Soon Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-8 text-center dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
          <Star className="h-8 w-8 text-white" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Enhanced Billing Features
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Advanced billing features and subscription plans coming soon
        </p>
      </motion.div>
    </motion.div>
  );
};

export default BillingPage;
