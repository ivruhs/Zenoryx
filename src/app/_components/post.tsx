"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

export function LatestPost() {
  const [latestPost] = api.post.getLatest.useSuspenseQuery();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      setName("");
    },
  });

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6 shadow-lg dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
        {latestPost ? (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Latest Post
            </h3>
            <p className="truncate rounded-lg border border-slate-200 bg-white px-4 py-3 font-medium text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              {latestPost.name}
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <p className="py-8 text-center text-slate-500 italic dark:text-slate-400">
              No posts yet. Create your first one below!
            </p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPost.mutate({ name });
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="post-title"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Post Title
            </label>
            <input
              id="post-title"
              type="text"
              placeholder="Enter your post title..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg"
            disabled={createPost.isPending}
          >
            {createPost.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Submitting...
              </span>
            ) : (
              "Create Post"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
