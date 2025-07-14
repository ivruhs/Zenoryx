"use client";
import { useForm } from "react-hook-form";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { api } from "../../../trpc/react";
import { toast } from "sonner";
import useRefetch from "../../../hooks/use-refetch";
import { Info, X } from "lucide-react";
import { useState } from "react";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};

const CreatePage = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput>();

  const [showDelayNotice, setShowDelayNotice] = useState(false);

  const createProject = api.project.createProject.useMutation();
  const checkCredits = api.project.checkCredits.useMutation();
  const refetch = useRefetch();
  const [showTokenModal, setShowTokenModal] = useState(false);

  function onCheckCredits(data: FormInput) {
    checkCredits.mutate(
      {
        githubUrl: data.repoUrl,
        githubToken: data.githubToken,
      },
      {
        onSuccess: (creditData) => {
          if (
            !creditData.userCredits ||
            creditData.fileCount > creditData.userCredits
          ) {
            toast.error("Not enough credits to create project.");
            return;
          }
          // Credits check successful, now user can choose to create project
        },
        onError: (error) => {
          toast.error(`Failed to check credits: ${error.message}`);
        },
      },
    );
  }

  function onCreateProject(data: FormInput) {
    setShowDelayNotice(true); // show notice popup
    setTimeout(() => {
      setShowDelayNotice(false); // auto-hide after 5 seconds
    }, 5000);
    createProject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: () => {
          toast.success("Project created successfully!");
          refetch();
          reset();
          // Reset credits data after successful project creation
          checkCredits.reset();
        },
        onError: (error) => {
          toast.error(`Failed to create project: ${error.message}`);
        },
      },
    );
  }

  function onCancel() {
    checkCredits.reset();
    reset();
  }

  const hasEnoughCredits = checkCredits?.data?.userCredits
    ? checkCredits.data.fileCount <= checkCredits.data.userCredits
    : true;

  const showCreditInfo = !!checkCredits.data && !checkCredits.isError;

  return (
    <>
      {showDelayNotice && (
        <div className="fixed right-6 bottom-6 z-50 w-[300px] rounded-xl border border-blue-200 bg-violet-200 px-4 py-3 text-violet-900 shadow-xl dark:border-blue-500/30 dark:bg-slate-800 dark:text-blue-200">
          <div className="flex items-start justify-between">
            <p className="text-sm">
              This process may take 2–4 minutes. Please be patient.
            </p>
            <button
              onClick={() => setShowDelayNotice(false)}
              className="ml-3 text-blue-200 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="flex h-full min-h-screen items-center justify-center px-4 py-12">
          <div className="flex w-full max-w-6xl flex-col items-center justify-center gap-12 lg:flex-row lg:gap-16">
            {/* Illustration */}
            <div className="order-2 flex-shrink-0 lg:order-1">
              <div className="relative">
                <div className="absolute inset-0 scale-110 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 blur-3xl"></div>
                <img
                  src="/undraw_developer.svg"
                  className="relative h-64 w-auto drop-shadow-2xl lg:h-80"
                  alt="Developer illustration"
                />
              </div>
            </div>

            {/* Form */}
            <div className="order-1 w-full max-w-md lg:order-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl lg:p-10 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-8 text-center">
                  <h1 className="mb-3 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-bold text-transparent lg:text-4xl dark:from-slate-100 dark:to-slate-300">
                    Link Repository
                  </h1>
                  <p className="text-sm leading-relaxed text-slate-600 lg:text-base dark:text-slate-400">
                    Connect your GitHub repository to get started with Dionysus
                  </p>
                </div>

                <form className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Project Name
                    </label>
                    <Input
                      {...register("projectName", { required: true })}
                      placeholder="My Awesome Project"
                      required
                      className="h-12 rounded-xl border-slate-300 transition-all duration-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Repository URL
                    </label>
                    <Input
                      {...register("repoUrl", { required: true })}
                      placeholder="https://github.com/username/repository"
                      type="url"
                      required
                      className="h-12 rounded-xl border-slate-300 transition-all duration-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      GitHub Token
                      <Button
                        type="button"
                        onClick={() => setShowTokenModal(true)}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                      >
                        Click me
                      </Button>
                    </div>

                    <Input
                      {...register("githubToken", {
                        required: "GitHub Token is required",
                      })}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      type="password"
                      className="h-12 rounded-xl border-slate-300 transition-all duration-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600"
                    />

                    {errors.githubToken && (
                      <p className="text-sm text-red-500">
                        {errors.githubToken.message}
                      </p>
                    )}
                  </div>

                  {showCreditInfo && (
                    <>
                      <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-orange-700">
                        <div className="items center flex gap-2">
                          <Info className="size-4" />
                          <p className="text-sm">
                            You will be charged{" "}
                            <strong>{checkCredits.data?.fileCount}</strong>{" "}
                            credits for this repository. <br />
                          </p>
                        </div>
                        <p className="ml-6 text-sm text-blue-600">
                          You have{" "}
                          <strong>{checkCredits.data?.userCredits}</strong>{" "}
                          credits remaining.
                        </p>
                      </div>
                    </>
                  )}

                  {!showCreditInfo ? (
                    <Button
                      type="button"
                      onClick={handleSubmit(onCheckCredits)}
                      disabled={checkCredits.isPending}
                      className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:opacity-50"
                    >
                      {checkCredits.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Checking Credits...
                        </span>
                      ) : (
                        "Check Credits"
                      )}
                    </Button>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={onCancel}
                        variant="outline"
                        className="h-12 flex-1 rounded-xl border-slate-300 font-semibold transition-all duration-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSubmit(onCreateProject)}
                        disabled={createProject.isPending || !hasEnoughCredits}
                        className="h-12 flex-1 rounded-xl bg-gradient-to-r from-green-600 to-green-700 font-semibold text-white shadow-lg transition-all duration-200 hover:from-green-700 hover:to-green-800 hover:shadow-xl disabled:opacity-50"
                      >
                        {createProject.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Creating...
                          </span>
                        ) : (
                          "Create Project"
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* GitHub Token Modal */}
        {showTokenModal && (
          <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  🔐 How to Create a GitHub Fine-Grained Personal Access Token
                  (PAT)
                </h2>
                <Button
                  onClick={() => setShowTokenModal(false)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  To securely connect your GitHub account with our application,
                  please follow the steps below to generate a{" "}
                  <strong>fine-grained GitHub token</strong> with{" "}
                  <strong>read-only access</strong> to the repository you want
                  to analyze.
                </p>

                <div>
                  <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                    ✅ Step-by-Step Instructions
                  </h3>
                  <ol className="space-y-2 pl-4">
                    <li>
                      <strong>1. Go to the GitHub PAT creation page:</strong>
                      <br />
                      👉{" "}
                      <a
                        href="https://github.com/settings/personal-access-tokens/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        Create a fine-grained token
                      </a>
                    </li>
                    <li>
                      <strong>2. Set token details:</strong>
                      <ul className="mt-1 ml-4 list-disc space-y-1">
                        <li>
                          <strong>Token name</strong>:{" "}
                          <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-700">
                            AI Repo Analyzer
                          </code>{" "}
                          (or anything you like)
                        </li>
                        <li>
                          <strong>Expiration</strong>: Choose 30 or 60 days
                          (recommended)
                        </li>
                        <li>
                          <strong>Resource owner</strong>: Your GitHub username
                          or organization
                        </li>
                      </ul>
                    </li>
                    <li>
                      <strong>3. Set Repository Access:</strong>
                      <ul className="mt-1 ml-4 list-disc space-y-1">
                        <li>
                          Choose ✅{" "}
                          <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-700">
                            Only select repositories
                          </code>
                        </li>
                        <li>
                          Select the repositories you want this token to access
                          (you can select up to 50)
                        </li>
                      </ul>
                    </li>
                    <li>
                      <strong>4. Set Permissions:</strong> Under the{" "}
                      <strong>Repository Permissions</strong> section, set:
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-600">
                              <th className="py-1 text-left">
                                Permission Category
                              </th>
                              <th className="py-1 text-left">Access Level</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-1">
                                📂 <strong>Contents</strong>
                              </td>
                              <td className="py-1">
                                <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-600">
                                  Read-only
                                </code>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1">
                                📦 <strong>Metadata</strong>
                              </td>
                              <td className="py-1">
                                <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-600">
                                  Read-only
                                </code>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </li>
                    <li>
                      <strong>5. Scroll to the bottom and click</strong> ✅{" "}
                      <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-700">
                        Generate token
                      </code>
                    </li>
                    <li>
                      <strong>6. Copy the token immediately</strong> — you{" "}
                      <strong>{`won't`}</strong> be able to see it again.
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                    🛡 Why Only These Permissions?
                  </h3>
                  <p>
                    We only request <strong>read-only access</strong> to the
                    contents and metadata of the repositories you select. This:
                  </p>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    <li>
                      <strong>Protects your data</strong>{" "}
                      {`we can't edit anything`}
                    </li>
                    <li>
                      <strong>Gives you full control</strong> (you can revoke it
                      anytime)
                    </li>
                    <li>
                      Ensures the token is{" "}
                      <strong>scoped only to {`what's`} necessary</strong>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700">
                  <code className="text-xs">
                    Repository access: Only select repositories ✅ → Repository
                    Permissions: ✅ Contents: Read-only ✅ Metadata: Read-only
                  </code>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                    ✅ Where to Paste This Token?
                  </h3>
                  <p>
                    Once {`you've`} generated the token, paste it into the input
                    field in our app when prompted.{" "}
                    <strong>We do not store your token</strong> — it is used
                    only for this session.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setShowTokenModal(false)}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreatePage;
