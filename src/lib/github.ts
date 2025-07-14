import { Octokit } from "octokit";
import { db } from "../server/db";
import axios from "axios";
import { aiSummariseCommit } from "./together";
import pLimit from "p-limit";
import "dotenv/config";

const CONCURRENCY_LIMIT = 3;
//CONCURRENCY_LIMIT = 3:
// 🚦 Maximum simultaneous AI summarization requests
// Why 3?: Balances performance vs API rate limits
// Impact: Prevents overwhelming AI service or GitHub API

const MAX_COMMITS = 10;
//📊 Maximum commits processed per request
// Performance: Prevents excessive processing on large repositories

interface Response {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
}

//📝 Interface Analysis:
// commitHash: 🔑 SHA identifier for the commit (40-character hex string)
// commitMessage: 💬 Commit description from developer
// commitAuthorName: 👤 Git author name (not GitHub username)
// commitAuthorAvatar: 🖼️ Profile picture URL from GitHub
// commitDate: 📅 ISO 8601 timestamp of commit creation

// ✅ Create per-request Octokit instance with user token
const createOctokit = (token?: string) => new Octokit({ auth: token });
//Creates authenticated Octokit instances with optional personal access tokens
//Rate limit benefits: Authenticated requests get higher rate limits (5000/hour vs 60/hour)

export const getCommitHashes = async (
  githubUrl: string,
  githubToken?: string,
): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);
  if (!owner || !repo) throw new Error("Invalid GitHub URL");

  const octokit = createOctokit(githubToken);

  const { data } = await octokit.rest.repos.listCommits({ owner, repo });

  // GitHub returns array of commit objects with nested structure:
  // json{
  //   "sha": "commit-hash",
  //   "commit": {
  //     "message": "commit message",
  //     "author": {
  //       "name": "Author Name",
  //       "date": "2023-01-01T00:00:00Z"
  //     }
  //   },
  //   "author": {
  //     "avatar_url": "https://github.com/avatar.jpg"
  //   }
  // }

  //🔄 Data Processing Pipeline:
  //Step 1: Sorting 📅
  //Step 2: Limiting 🔢 : slice(0, MAX_COMMITS): Takes first 10 commits
  //Step 3: Mapping 🗺️ : Extracts relevant fields into Response format

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

//Orchestrates the complete commit processing pipeline from fetching to database storage
export const pullCommits = async (projectId: string, githubToken?: string) => {
  const { githubUrl } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await getCommitHashes(githubUrl, githubToken);
  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes,
  );
  //Efficiency: Avoids reprocessing existing commits
  // Database query: Checks existing commit hashes

  const limit = pLimit(CONCURRENCY_LIMIT);

  const summaryResponses = await Promise.allSettled(
    unprocessedCommits.map((commit) =>
      limit(() => summariseCommit(githubUrl, commit.commitHash, githubToken)),
    ),
  );

  //Promise.allSettled: Handles partial failures gracefully
  //map() + limit(): Applies concurrency control to each commit

  const summaries = summaryResponses.map((response, index) => {
    if (response.status === "fulfilled") return response.value as string;
    console.error(
      `[Commit ${unprocessedCommits[index]!.commitHash}] Summary failed.`,
    );
    return `⚠️ Could not summarise commit ${unprocessedCommits[index]!.commitHash}`;
  });

  //createMany: Bulk insert for performance
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
    //Gets everything after "github.com/" //Removes trailing slash if present

    const apiUrl = `https://api.github.com/repos/${repoPath}/commits/${commitHash}`;

    // Log the constructed URL for debugging
    console.log(`[summariseCommit] API URL: ${apiUrl}`);

    const { data } = await axios.get(apiUrl, {
      headers: {
        Accept: "application/vnd.github.v3.diff", //📋 Requests diff format instead of JSON
        ...(githubToken && { Authorization: `Bearer ${githubToken}` }), //adds header only if token exists
      },
    });

    //With diff accept header, GitHub returns unified diff format:

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

//Filters out commits that have already been processed to avoid duplicate work
async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
): Promise<Response[]> {
  const processed = await db.commit.findMany({ where: { projectId } });
  const processedSet = new Set(processed.map((p) => p.commitHash));
  return commitHashes.filter((c) => !processedSet.has(c.commitHash));
}

/*
🏗️ System Architecture Analysis
🔄 Data Flow:

Project ID → Database lookup → GitHub URL
GitHub URL → API call → Recent commits
Commit hashes → Database check → Unprocessed commits
Commit hash → GitHub API → Diff content
Diff content → AI service → Summary
Summary + metadata → Database → Stored commits

🚦 Concurrency Strategy:

Parallel processing: Multiple commits processed simultaneously
Rate limiting: Prevents API abuse
Error isolation: Individual commit failures don't affect others
Resource management: Limits memory and CPU usage

🛡️ Error Resilience:

Graceful degradation: System continues with partial failures
Detailed logging: Enables debugging and monitoring
Fallback values: Provides meaningful error messages to users
Transaction safety: Database operations are atomic
*/
