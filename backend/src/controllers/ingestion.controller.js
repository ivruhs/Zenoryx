// src/controllers/ingestion.controller.js

/**
 * This is where the magic happens. When a request hits this controller, we follow a strict "fail-fast" strategy:
 * 1. we extract the owner and repo from the githubUrl
 * 2. we ask our ambassador (github.service.js) for the entire file tree.
 * 3. we ask our bouncer (fileUtils.js) to filter out the junk files.
 * 4. The Safety Valve : if there are more than 25 code files, we immediately throw a 400 Bad Request error. We do this before saving anything to the database or queueing any jobs.
 * 5. If the repo passes the safety valve, we create a PENDING Project in PostgreSQL and add a job to the ingestionQueue (BullMQ Queue) to process the repo asynchronously.
 *
 *We also need a simple getStatus function so that the frontend can poll the backend to see if the status has changed from PENDING to PROCESSING to READY.
 *
 */

const prisma = require("../prisma/client");
const { ingestionQueue } = require("../queues/queue");
const githubService = require("../services/github.service");
const fileUtils = require("../lib/fileUtils");

/**
 * Validates the repo, enforces the 25-file limit, and queues the ingestion job if the repo is valid.
 */

const triggerIngestion = async (req, res, next) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl || !repoUrl.startsWith("https://github.com/")) {
      return res
        .status(400)
        .json({ error: "Valid GitHub repository URL is required." });
    }

    // parse URL : https://github.com/owner/repo
    const parts = repoUrl.replace("https://github.com/", "").split("/");
    const repoOwner = parts[0];
    const repoName = parts[1]?.replace(".git", ""); // remove .git if they copied the clone link

    if (!repoOwner || !repoName) {
      return res.status(400).json({ error: "Invalid GitHub URL format." });
    }

    // 1. fetch the entire file tree from GitHub
    const tree = await githubService.fetchRepoTree(repoOwner, repoName);

    // 2. filter down to ONLY valid code files that are under the 1MB limit

    const codeFiles = tree.filter((file) => {
      return (
        file.type === "blob" &&
        fileUtils.isCodeFile(file.path) &&
        !fileUtils.exceedsSize(file.size)
      );
    });

    // 3. the 25-file safety valve check
    if (codeFiles.length > 25) {
      return res.status(400).json({
        error: `Repository contains ${codeFiles.length} code files, exceeding the 25-file limit.`,
        details: {
          codeFileCount: codeFiles.length,
          limit: 25,
          suggestion: "Try a smaller repository or wait for V2.",
        },
      });
    }

    if (codeFiles.length === 0) {
      return res
        .status(400)
        .json({ error: "No supported code files found in this repository." });
    }

    // 4. Everything looks good. create the project in the database as PENDING.
    const project = await prisma.project.create({
      data: {
        name: `${repoOwner}/${repoName}`,
        repoUrl: repoUrl,
        repoOwner: repoOwner,
        repoName: repoName,
        status: "PENDING",
        userId: req.user.id, // comes from the auth middleware (auth.guard.js)!
      },
    });

    // 5. drop the job into the BULLMQ mailbox
    await ingestionQueue.add(
      "ingest",
      {
        projectId: project.id,
      },
      {
        attempts: 3, // retry up to 3 times if the job fails
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    );

    // 6. Respond immediately to the user
    return res.status(202).json({
      message: "Repository accepted and queued for processing.",
      projectId: project.id,
      status: "PENDING",
    });
  } catch (error) {
    // Catch GitHub API 404s (Repo not found or private)
    if (error.status === 404) {
      return res.status(404).json({
        error:
          "Repository not found. Ensure it is public and the URL is correct.",
      });
    }
    next(error);
    // next(error) will pass the error to the global error handler (present in server.js) which will log it and return a 500 Internal Server Error to the user.
  }
};

/**
 * Allows the frontend to poll the current status of the ingestion process for a given project.
 */

const getStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        fileCount: true,
        errorMessage: true,
      },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }
    return res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // From auth guard

    // 1. Authorization: Verify the user owns this project
    const project = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) {
      return res
        .status(404)
        .json({ error: "Project not found or unauthorized." });
    }

    // 2. Queue Cleanup (BullMQ / Upstash Redis)
    // If the user deletes a project while it is still "PENDING", we must remove it from the queue
    const pendingJobs = await ingestionQueue.getJobs([
      "waiting",
      "delayed",
      "active",
    ]);
    for (const job of pendingJobs) {
      if (job.data.projectId === id) {
        // Remove the job from Redis so the worker never picks it up
        await job.remove().catch(() => {});
      }
    }

    // 3. Database Cleanup
    // Because code_chunks contains an Unsupported("vector") type, we use raw SQL to ensure safe deletion
    await prisma.$executeRaw`DELETE FROM "code_chunks" WHERE "projectId" = ${id}`;

    // Delete Commits
    await prisma.commit.deleteMany({
      where: { projectId: id },
    });

    // Delete the actual Project record
    await prisma.project.delete({
      where: { id },
    });

    return res.status(200).json({
      message:
        "Project, vector embeddings, and queue jobs successfully deleted.",
    });
  } catch (error) {
    next(error);
  }
};

const getUserProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        repoOwner: true,
        repoName: true,
        status: true,
        fileCount: true,
        totalSize: true, // This comes back as a BigInt
        createdAt: true,
      },
    });

    // Convert the BigInt to a standard Number before sending as JSON
    const serializedProjects = projects.map((project) => ({
      ...project,
      totalSize: project.totalSize ? Number(project.totalSize) : 0,
    }));

    return res.status(200).json(serializedProjects);
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) {
      return res
        .status(404)
        .json({ error: "Project not found or unauthorized." });
    }

    // Convert BigInt to Number safely
    const serializedProject = {
      ...project,
      totalSize: project.totalSize ? Number(project.totalSize) : 0,
    };

    return res.status(200).json(serializedProject);
  } catch (error) {
    next(error);
  }
};

const getProjectCommits = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Verify ownership first to prevent data leaking
    const project = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) {
      return res
        .status(404)
        .json({ error: "Project not found or unauthorized." });
    }

    // 2. Fetch the commits ordered by newest first
    const commits = await prisma.commit.findMany({
      where: { projectId: id },
      orderBy: { date: "desc" },
    });

    return res.status(200).json(commits);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerIngestion,
  getStatus,
  deleteProject,
  getUserProjects,
  getProjectCommits,
  getProjectById,
};
