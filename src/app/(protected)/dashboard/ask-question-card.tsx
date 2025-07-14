"use client";

import React from "react";
import useProject from "../../../hooks/use-project";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import Image from "next/image";
import { askQuestion } from "./actions";
import { readStreamableValue } from "ai/rsc";
import MDEditor from "@uiw/react-md-editor";
import CodeReferences from "./code-references";
import { api } from "../../../trpc/react";
import { toast } from "sonner";
import useRefetch from "../../../hooks/use-refetch";
import { MessageCircle, Save, Sparkles } from "lucide-react";

const AskQuestionCard = () => {
  const { project } = useProject();
  const [question, setQuestion] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [filesReferences, setFilesReferences] = React.useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([]);
  const [answer, setAnswer] = React.useState("");
  const saveAnswer = api.project.saveAnswer.useMutation();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setAnswer("");
    setFilesReferences([]);
    e.preventDefault();
    if (!project?.id) return;
    setLoading(true);
    try {
      const { output, filesReferences } = await askQuestion(
        question,
        project.id,
      );
      setOpen(true);
      setFilesReferences(filesReferences);
      for await (const delta of readStreamableValue(output)) {
        if (delta) {
          setAnswer((ans) => ans + delta);
        }
      }
    } catch (err) {
      console.error("AskQuestion error", err);
      setAnswer("⚠️ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refetch = useRefetch();

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[90vw] lg:max-w-[80vw]">
          <DialogHeader className="border-b border-slate-200 pb-4 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-2">
                  <Image
                    src="/logo (1).png"
                    alt="Zenoryx"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                </div>
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  AI Response
                </DialogTitle>
              </div>
              <Button
                disabled={saveAnswer.isPending}
                variant="outline"
                size="sm"
                onClick={() => {
                  saveAnswer.mutate(
                    {
                      projectId: project!.id,
                      question: question,
                      answer: answer,
                      filesReferences: filesReferences,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Answer saved successfully!");
                        refetch();
                      },
                      onError: (err) => {
                        toast.error(
                          `Failed to save answer: ${err.message || "Unknown error"}`,
                        );
                      },
                    },
                  );
                }}
                className="rounded-xl border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Answer
              </Button>
            </div>
          </DialogHeader>

          <div className="max-h-[80vh] flex-1 space-y-6 overflow-y-auto py-4">
            <div className="rounded-2xl bg-slate-800 p-6 dark:bg-slate-800">
              <MDEditor.Markdown
                source={answer}
                className="prose prose-slate dark:prose-invert max-h-[40vh] max-w-none overflow-auto !bg-transparent"
              />
            </div>

            {filesReferences.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Code References
                </h3>
                <CodeReferences fileRefereces={filesReferences} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="relative col-span-3 border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-xl dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-2">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            Ask Zenoryx
            <Sparkles className="ml-auto h-5 w-5 text-yellow-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                What would you like to know about your codebase?
              </label>
              <Textarea
                placeholder="Which file should I edit to change the home page? How does the authentication work? Explain the database schema..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[120px] resize-none rounded-xl border-slate-300 transition-all duration-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !question.trim()}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Thinking...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Ask Zenoryx!
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AskQuestionCard;
