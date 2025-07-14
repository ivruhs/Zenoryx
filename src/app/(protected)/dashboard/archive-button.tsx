"use client";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import useProject from "../../../hooks/use-project";
import { api } from "../../../trpc/react";
import React from "react";
import { Archive } from "lucide-react";
import useRefetch from "../../../hooks/use-refetch";

const ArchiveButton = () => {
  const archiveProject = api.project.deleteProject.useMutation();
  const { projectId } = useProject();
  const refetch = useRefetch();
  return (
    <Button
      disabled={archiveProject.isPending}
      onClick={() => {
        if (!projectId) {
          toast.error("Project ID not found.");
          return;
        }
        const confirm = window.confirm(
          "Are you sure you want to archive this project?",
        );
        if (confirm) {
          archiveProject.mutate(
            { projectId },
            {
              onSuccess: () => {
                toast.success("Project deleted successfully");
                refetch();
              },
              onError: (error) => {
                toast.error(`Failed to archive project: ${error.message}`);
              },
            },
          );
        }
      }}
      variant="outline"
      size="sm"
      className="rounded-xl border-red-300 bg-transparent text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
    >
      <Archive className="mr-2 h-4 w-4" />
      Delete
    </Button>
  );
};

export default ArchiveButton;
