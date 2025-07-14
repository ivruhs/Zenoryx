"use client";

import React from "react";
import useProject from "../../../hooks/use-project";
import { api } from "../../../trpc/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../../components/ui/sheet";
import AskQuestionCard from "../dashboard/ask-question-card";
import MDEditor from "@uiw/react-md-editor";
import CodeReferences from "../dashboard/code-references";
import { MessageCircle, Calendar, User } from "lucide-react";

const QAPage = () => {
  const { projectId } = useProject();
  const { data: questions } = api.project.getQuestions.useQuery({ projectId });
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const question = questions?.[questionIndex];

  return (
    <Sheet>
      <div className="space-y-8">
        {/* Ask Question Section */}
        <div>
          <AskQuestionCard />
        </div>

        {/* Saved Questions Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-2">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Saved Questions
            </h1>
          </div>

          {questions && questions.length > 0 ? (
            <div className="grid gap-4">
              {questions?.map((question, index) => {
                return (
                  <React.Fragment key={question.id}>
                    <SheetTrigger onClick={() => setQuestionIndex(index)}>
                      <div className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all duration-200 hover:bg-slate-50 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                        <div className="flex items-start gap-4">
                          {/* User Avatar */}
                          <div className="flex-shrink-0">
                            <img
                              className="h-12 w-12 rounded-full border-2 border-slate-200 shadow-sm dark:border-slate-600"
                              src={question.user.imageUrl ?? ""}
                              alt="User avatar"
                            />
                          </div>

                          {/* Question Content */}
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 transition-colors duration-200 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                                {question.question}
                              </h3>
                              <div className="flex flex-shrink-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Calendar className="h-3 w-3" />
                                {question.createdAt.toLocaleDateString()}
                              </div>
                            </div>

                            <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                              {question.answer}
                            </p>

                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <User className="h-3 w-3" />
                              <span>Asked by you</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SheetTrigger>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800">
              <MessageCircle className="mx-auto mb-4 h-16 w-16 text-slate-400" />
              <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                No saved questions yet
              </h3>
              <p className="mx-auto max-w-md text-slate-600 dark:text-slate-400">
                Start asking questions about your codebase and they will appear
                here for future reference.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Question Detail Sheet */}
      {question && (
        <SheetContent className="overflow-auto sm:max-w-[90vw] lg:max-w-[80vw]">
          <SheetHeader className="mb-6 border-b border-slate-200 pb-6 dark:border-slate-700">
            <SheetTitle className="text-left text-xl font-semibold text-slate-900 dark:text-slate-100">
              {question.question}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-800">
              <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
                Answer
              </h3>
              <MDEditor.Markdown
                source={question.answer}
                className="prose prose-slate dark:prose-invert max-w-none"
              />
            </div>

            {question.filesReferences &&
              (question.filesReferences as any).length > 0 && (
                <div className="mr-3 mb-3 ml-3">
                  <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
                    Code References
                  </h3>
                  <CodeReferences
                    fileRefereces={(question.filesReferences ?? []) as any}
                  />
                </div>
              )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
};

export default QAPage;
