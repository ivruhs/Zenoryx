"use client";
import { ExternalLink, Github, Users, Archive, Plus } from "lucide-react";
import Link from "next/link";
import useProject from "../../../hooks/use-project";
import CommitLog from "./commit-log";
import AskQuestionCard from "./ask-question-card";
import { Button } from "../../../components/ui/button";
import ArchiveButton from "./archive-button";
import InviteButton from "./invite-button";
import TeamMembers from "./team-members";

const DashboardPage = () => {
  const { project } = useProject();

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 p-6 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* GitHub Link */}
          <div className="flex-1">
            <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 p-4 shadow-lg dark:from-slate-700 dark:to-slate-600">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2">
                  <Github className="h-5 w-5 text-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm font-medium text-white">
                    Connected Repository
                  </p>
                  <Link
                    href={project?.githubUrl ?? ""}
                    className="group inline-flex items-center gap-2 text-sm text-slate-300 transition-colors duration-200 hover:text-white"
                  >
                    <span className="truncate">{project?.githubUrl}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* <Button
             variant="outline"
             size="sm"
             className="rounded-xl border-slate-300 bg-transparent hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
           >
             <Users className="mr-2 h-4 w-4" />
             Team Members
           </Button> */}
            <TeamMembers />
            <InviteButton />
            <ArchiveButton />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-5">
        {/* Ask Question Card */}
        <div className="xl:col-span-3">
          <AskQuestionCard />
        </div>

        {/* Meeting Card Placeholder */}
        <div className="xl:col-span-2">
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Meeting Card
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Meeting functionality coming soon
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Commit Log Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <CommitLog />
      </div>
    </div>
  );
};

export default DashboardPage;
