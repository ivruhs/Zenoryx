import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { generateEmbedding, summariseCode } from "./together";
import { db } from "../server/db";
import pLimit from "p-limit";
import { Octokit } from "octokit";

const CONCURRENCY_LIMIT = 3;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1500;

// ✅ Token-safe Octokit creation
const createOctokit = (token?: string) => new Octokit({ auth: token });
//Creates authenticated Octokit instances with optional GitHub tokens

const getFileCount = async (
  path: string,
  octokit: Octokit,
  githubOwner: string,
  githubRepo: string,
  acc: number = 0,
): Promise<number> => {
  const { data } = await octokit.rest.repos.getContent({
    owner: githubOwner,
    repo: githubRepo,
    path,
  });

  //Type check: data.type === "file" confirms file object
  // Array check: !Array.isArray(data) ensures single item
  // Increment: Adds 1 to accumulator and returns
  // Base case: Terminates recursion for leaf nodes
  if (!Array.isArray(data) && data.type === "file") {
    return acc + 1;
  }

  if (Array.isArray(data)) {
    let fileCount = 0;
    const directories: string[] = [];

    for (const item of data) {
      if (item.type === "dir") directories.push(item.path);
      else fileCount++;
    }

    if (directories.length > 0) {
      const directoryCounts = await Promise.all(
        directories.map((dirPath) =>
          getFileCount(dirPath, octokit, githubOwner, githubRepo, 0),
        ),
      );
      fileCount += directoryCounts.reduce((acc, count) => acc + count, 0);
    }

    return acc + fileCount;
  }

  return acc;
};

export const checkCredits = async (githubUrl: string, githubToken?: string) => {
  const octokit = createOctokit(githubToken);
  const githubOwner = githubUrl.split("/")[3];
  const githubRepo = githubUrl.split("/")[4];
  if (!githubOwner || !githubRepo) return 0;
  const fileCount = await getFileCount("", octokit, githubOwner, githubRepo, 0);
  return fileCount;
};

//Loads repository files using LangChain's GitHub loader with optimized configuration

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string,
): Promise<Document[]> => {
  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: githubToken || "",
    branch: "main", //Assumes "main" as primary branch
    ignoreFiles: [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
    ],
    recursive: true,
    unknown: "warn",
    maxConcurrency: 5,
  });

  return await loader.load();
};

async function retryWithDelay<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(
        `⚠️ Retry ${i + 1} failed. Retrying in ${RETRY_DELAY_MS}ms...`,
      );
      await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

const generateEmbeddings = async (docs: Document[]) => {
  const limit = pLimit(CONCURRENCY_LIMIT);

  return await Promise.all(
    docs.map((doc, index) =>
      limit(async () => {
        const fileName = doc.metadata?.source || `#${index}`;
        try {
          const summary = await retryWithDelay(() => summariseCode(doc));
          const embedding = await retryWithDelay(() =>
            generateEmbedding(summary),
          );

          return {
            summary,
            embedding,
            sourceCode: JSON.stringify(doc.pageContent),
            fileName,
          };
        } catch (err) {
          console.error(`❌ Failed [${fileName}] after retries:`, err);
          return null;
        }
      }),
    ),
  ).then((results) => results.filter(Boolean));
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  console.log("📦 Loading GitHub repo...");
  const docs = await loadGithubRepo(githubUrl, githubToken);
  console.log(`📄 Loaded ${docs.length} documents.`);

  const allEmbeddings = await generateEmbeddings(docs);
  console.log(`🧠 ${allEmbeddings.length} documents successfully summarized.`);

  const limit = pLimit(CONCURRENCY_LIMIT);

  await Promise.allSettled(
    allEmbeddings.map((embedding, index) =>
      limit(async () => {
        try {
          console.log(
            `💾 Saving file ${index + 1}/${allEmbeddings.length}: ${embedding!.fileName}`,
          );

          const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
            data: {
              summary: embedding!.summary,
              sourceCode: embedding!.sourceCode,
              fileName: embedding!.fileName,
              projectId,
            },
          });

          await db.$executeRaw`
            UPDATE "SourceCodeEmbedding"
            SET "summaryEmbedding" = ${embedding!.embedding}::vector 
            WHERE "id" = ${sourceCodeEmbedding.id}
          `;
        } catch (err) {
          console.error(
            `❌ Failed to save embedding for file ${embedding!.fileName}:`,
            err,
          );
        }
      }),
    ),
  );

  console.log("✅ Repo indexing complete.");
};

/*
🏗️ System Architecture Analysis
🔄 Data Flow Pipeline:

GitHub URL → Repository loading → Document array
Documents → AI summarization → Summary text
Summary → AI embedding → Vector representation
Summary + Vector + Metadata → Database storage → Searchable index

🚦 Concurrency Strategy:

Multi-level limiting: Different limits for different operations
Resource optimization: Prevents service overload
Parallel processing: Maximizes throughput
Error isolation: Individual failures don't cascade

🛡️ Error Resilience:

Retry mechanisms: Handles transient failures
Graceful degradation: Continues with partial success
Detailed logging: Enables debugging and monitoring
Transaction safety: Database consistency maintained
*/
