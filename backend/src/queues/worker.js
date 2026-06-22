// src/queues/worker.js
// This file does not run inside our express server. we shall run it in a completely separate terminal tab using npm run dev:worker script that's there in package.json. If this worker crashes on a massive file, our API stays online.

// Note: bcoz prisma does not natively support writing to Unsopperted("vector") fields, we must bypass Prisma's standard create() function and use $executeRaw to insert the vector array directly into the database.

// Also, we shall process the files one by one using for of loop instead of Promise.all() bcoz trying to embed 50 chunks simultaneously will instantly trigger Gemini's rate limits and cause the worker to crash. So we must embed the chunks sequentially to avoid hitting those limits.

const { Worker } = require("bullmq");
const crypto = require("crypto");
const prisma = require("../prisma/client");
const { redisConnection } = require("./queue");
const githubService = require("../services/github.service");
const geminiService = require("../services/gemini.service");
const groqService = require("../services/groq.service");
const chunker = require("../lib/chunker");
const fileUtils = require("../lib/fileUtils");
const logger = require("../lib/logger");

const withTimeout = (promise, ms, operationName) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () =>
        reject(
          new Error(`[Timeout] ${operationName} took longer than ${ms}ms`),
        ),
      ms,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeoutId),
  );
};

/**
 *
 * The main job processor. this function is called every time a job is pulled from the queue.
 */

async function processIngestion(job) {
  const { projectId } = job.data;
  logger.info({ projectId }, "Worker picked up new ingestion job");

  //1. Mark project as processing in the database
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status: "PROCESSING" },
  });

  try {
    //2. Fetch the file tree and filter
    const tree = await githubService.fetchRepoTree(
      project.repoOwner,
      project.repoName,
    );
    const codeFiles = tree.filter(
      (f) => f.type === "blob" && fileUtils.isCodeFile(f.path),
    );

    // Enforcing limit for V1
    const filesToProcess = codeFiles.slice(0, 25);
    let totalProcessedSize = 0;

    for (const file of filesToProcess) {
      logger.debug(`Downloading file ${file.path} from GitHub...`);

      const fileContent = await githubService.getRawFile(
        project.repoOwner,
        project.repoName,
        file.path,
      );

      const fileSize = Buffer.byteLength(fileContent, "utf-8");
      if (fileUtils.exceedsSize(fileSize)) {
        logger.warn(`Skipping ${file.path} - exceeds 1MB limit`);
        continue;
      }

      totalProcessedSize += fileSize;
      const language = fileUtils.getLanguage(file.path);

      const chunks = chunker.chunkCode(fileContent, language);

      for (const chunk of chunks) {
        if (chunk.content.trim().length < 20) continue;

        // 🚨 IDEMPOTENCY CHECK
        const existingChunk = await prisma.$queryRaw`
          SELECT id FROM code_chunks 
          WHERE "projectId" = ${projectId} 
            AND "filePath" = ${file.path} 
            AND "chunkIndex" = ${chunk.chunkIndex}
          LIMIT 1
        `;

        if (existingChunk.length > 0) {
          logger.debug(
            `Skipping ${file.path} (Chunk ${chunk.chunkIndex}) - already processed.`,
          );
          continue;
        }

        // 🚨 INTERNAL ERROR BOUNDARY: Prevents one bad API call from crashing the whole file
        try {
          const summary = await withTimeout(
            geminiService.generateSummary(chunk.content),
            10000,
            "Gemini Summary",
          );
          const embedding = await withTimeout(
            geminiService.generateEmbedding(chunk.content),
            10000,
            "Gemini Embedding",
          );

          const vectorString = `[${embedding.join(",")}]`;
          const chunkId = crypto.randomUUID();

          await prisma.$executeRaw`
          INSERT INTO "code_chunks" ("id", "filePath", "chunkIndex", "summary", "content", "embedding", "projectId")
            VALUES (${chunkId}, ${file.path}, ${chunk.chunkIndex}, ${summary}, ${chunk.content}, ${vectorString}::vector, ${projectId})
          `;

          // 🚨 500ms breather to prevent API rate limits
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (apiError) {
          logger.warn(
            `Skipping chunk ${chunk.chunkIndex} in ${file.path}: ${apiError.message}`,
          );
          continue; // Move to the next chunk safely
        }
      }
    }

    // 7. process recent commits
    logger.info("Fetching recent commits for summarization...");
    const commits = await githubService.getCommits(
      project.repoOwner,
      project.repoName,
      5,
    );
    for (const commitData of commits) {
      const sha = commitData.sha;
      const message = commitData.commit.message;
      const authorName = commitData.commit.author.name;
      const authorEmail = commitData.commit.author.email;
      const date = new Date(commitData.commit.author.date);

      const diffText = await githubService.getCommitDiff(
        project.repoOwner,
        project.repoName,
        sha,
      );
      const aiSummary = await groqService.summarizeDiff(diffText);

      await prisma.commit.create({
        data: {
          sha,
          message,
          authorName,
          authorEmail,
          date,
          aiSummary,
          projectId,
        },
      });
    }

    // 8. Mark Project as READY
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "READY",
        fileCount: filesToProcess.length,
        totalSize: totalProcessedSize,
      },
    });

    logger.info({ projectId }, "Ingestion completed successfully!");
  } catch (error) {
    logger.error(error, `Job failed for project ${projectId}`);
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "FAILED",
        errorMessage:
          error.message || "An unknown error occurred during ingestion.",
      },
    });
    throw error;
  }
}

// Instantiate the Worker
// watch queue names 'ingestion'. when a job appears: run processIngestion()
const worker = new Worker("ingestion", processIngestion, {
  connection: redisConnection,
  concurrency: 1, // Strictly process one repo at a time to protect AI rate limits
});

worker.on("failed", (job, err) => {
  logger.error(`Job ${job.id} failed with error: ${err.message}`);
});

logger.info("Background Worker Engine is alive and listening for jobs...");

// Define the shutdown logic
const gracefulShutdown = async (signal) => {
  console.log(`\n[Worker] Received ${signal}, closing worker gracefully...`);
  try {
    // This tells BullMQ to stop accepting new jobs and wait for the current one to finish
    await worker.close();
    console.log("[Worker] Worker closed. No jobs were corrupted.");
    process.exit(0);
  } catch (error) {
    console.error("[Worker] Error during shutdown:", error);
    process.exit(1);
  }
};

// Listen for termination signals from the OS/Hosting Provider
process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C in terminal
process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // Deployment restarts

/**
 * Final Flow:
 *
User submits repo
        ↓
Express Server
        ↓
BullMQ Queue
        ↓
Redis stores job
        ↓
Worker picks job
        ↓
GitHub API
        ↓
Download files
        ↓
Chunk code
        ↓
Gemini Summary
        ↓
Gemini Embedding
        ↓
Store vectors in pgvector
        ↓
Fetch commits
        ↓
Groq summaries
        ↓
Project READY
        ↓
User asks question
        ↓
Vector Search
        ↓
Groq answers
 */
