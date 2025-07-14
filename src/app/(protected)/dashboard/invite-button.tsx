"use client";

import React, { useEffect, useState } from "react";
import useProject from "../../../hooks/use-project";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Plus } from "lucide-react";

const InviteButton = () => {
  const { projectId } = useProject();
  const [open, setOpen] = React.useState(false);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    if (projectId) {
      setInviteLink(`${window.location.origin}/join/${projectId}`);
    }
  }, [projectId]);

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied to clipboard");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Members</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Ask them to copy and paste this link
          </p>
          <Input
            className="mt-4"
            readOnly
            value={inviteLink}
            onClick={handleCopy}
          />
        </DialogContent>
      </Dialog>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="rounded-xl border-slate-300 bg-transparent hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        <Plus className="mr-2 h-4 w-4" />
        Invite Members
      </Button>
    </>
  );
};

export default InviteButton;
