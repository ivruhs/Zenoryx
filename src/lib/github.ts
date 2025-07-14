import { Octokit } from "octokit";
import { db } from "../server/db";
import axios from "axios";
import { aiSummariseCommit } from "./together";
import pLimit from "p-limit";
import "dotenv/config";

const CONCURRENCY_LIMIT = 3;
const MAX_COMMITS = 10;

interface Response {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
}

// ✅ Create per-request Octokit instance with user token
const createOctokit = (token?: string) => new Octokit({ auth: token });

export const getCommitHashes = async (
  githubUrl: string,
  githubToken?: string,
): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);
  if (!owner || !repo) throw new Error("Invalid GitHub URL");

  const octokit = createOctokit(githubToken);

  const { data } = await octokit.rest.repos.listCommits({ owner, repo });

  return data
    .sort(
      (a: any, b: any) =>
        new Date(b.commit.author.date).getTime() -
        new Date(a.commit.author.date).getTime(),
    )
    .slice(0, MAX_COMMITS)
    .map((commit: any) => ({
      commitHash: commit.sha,
      commitMessage: commit.commit.message ?? "",
      commitAuthorName: commit.commit?.author?.name ?? "",
      commitAuthorAvatar: commit?.author?.avatar_url ?? "",
      commitDate: commit.commit?.author?.date ?? "",
    }));
};

export const pullCommits = async (projectId: string, githubToken?: string) => {
  const { githubUrl } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await getCommitHashes(githubUrl, githubToken);
  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes,
  );

  const limit = pLimit(CONCURRENCY_LIMIT);

  const summaryResponses = await Promise.allSettled(
    unprocessedCommits.map((commit) =>
      limit(() => summariseCommit(githubUrl, commit.commitHash, githubToken)),
    ),
  );

  const summaries = summaryResponses.map((response, index) => {
    if (response.status === "fulfilled") return response.value as string;
    console.error(
      `[Commit ${unprocessedCommits[index]!.commitHash}] Summary failed.`,
    );
    return `⚠️ Could not summarise commit ${unprocessedCommits[index]!.commitHash}`;
  });

  await db.commit.createMany({
    data: summaries.map((summary, index) => {
      const commit = unprocessedCommits[index];
      return {
        projectId,
        commitHash: commit!.commitHash,
        commitMessage: commit!.commitMessage,
        commitAuthorName: commit!.commitAuthorName,
        commitAuthorAvatar: commit!.commitAuthorAvatar,
        commitDate: commit!.commitDate,
        summary,
      };
    }),
  });
};

// async function summariseCommit(
//   githubUrl: string,
//   commitHash: string,
//   githubToken?: string,
// ) {
//   try {
//     console.log(`[summariseCommit] Fetching diff for ${commitHash}...`);

//     const apiUrl = `https://api.github.com/repos/${githubUrl}
//       .split("github.com/")[1]
//       .replace(/\/$/, "")}/commits/${commitHash}`;

//     const { data } = await axios.get(`${apiUrl}`, {
//       headers: {
//         Accept: "application/vnd.github.v3.diff",
//         ...(githubToken && { Authorization: `Bearer ${githubToken}` }),
//       },
//     });

//     console.log(`[summariseCommit] Diff fetched for ${commitHash}`);
//     return await aiSummariseCommit(data);
//   } catch (error: any) {
//     console.error(`[summariseCommit] Error for ${commitHash}:`, error.message);
//     return `⚠️ Could not summarise commit ${commitHash}. Error: ${error.message}`;
//   }
// }
async function summariseCommit(
  githubUrl: string,
  commitHash: string,
  githubToken?: string,
) {
  try {
    console.log(`[summariseCommit] Fetching diff for ${commitHash}...`);

    // Fix URL construction - move the string manipulation outside the template literal
    const repoPath = githubUrl.split("github.com/")[1]!.replace(/\/$/, "");

    const apiUrl = `https://api.github.com/repos/${repoPath}/commits/${commitHash}`;

    // Log the constructed URL for debugging
    console.log(`[summariseCommit] API URL: ${apiUrl}`);

    const { data } = await axios.get(apiUrl, {
      headers: {
        Accept: "application/vnd.github.v3.diff",
        ...(githubToken && { Authorization: `Bearer ${githubToken}` }),
      },
    });

    console.log(`[summariseCommit] Diff fetched for ${commitHash}`);
    return await aiSummariseCommit(data);
  } catch (error: any) {
    console.error(`[summariseCommit] Error for ${commitHash}:`, error.message);

    // Enhanced error logging
    if (error.response) {
      console.error(`[summariseCommit] Status: ${error.response.status}`);
      console.error(
        `[summariseCommit] Response: ${JSON.stringify(error.response.data)}`,
      );
    }

    return `⚠️ Could not summarise commit ${commitHash}. Error: ${error.message}`;
  }
}

async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { githubUrl: true },
  });

  if (!project?.githubUrl)
    throw new Error("Project does not have a GitHub URL");
  return { githubUrl: project.githubUrl };
}

async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
): Promise<Response[]> {
  const processed = await db.commit.findMany({ where: { projectId } });
  const processedSet = new Set(processed.map((p) => p.commitHash));
  return commitHashes.filter((c) => !processedSet.has(c.commitHash));
}
