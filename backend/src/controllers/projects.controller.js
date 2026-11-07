// Repository lifecycle: validate → create (enqueue) → status → explore → delete.
const prisma = require("../prisma/client");
const config = require("../config");
const github = require("../services/github.service");
const fileUtils = require("../lib/fileUtils");
const { parseRepoUrl } = require("../lib/githubUrl");
const { runner } = require("../jobs/runner");
const { HttpError } = require("../middleware/errors");

const LIST_FIELDS = {
  id: true,
  name: true,
  repoOwner: true,
  repoName: true,
  repoUrl: true,
  status: true,
  stage: true,
  description: true,
  stars: true,
  primaryLanguage: true,
  totalFiles: true,
  fileCount: true,
  processedCount: true,
  chunkCount: true,
  languages: true,
  errorMessage: true,
  createdAt: true,
  completedAt: true,
  startedAt: true,
  updatedAt: true,
};

function serialize(project) {
  if (!project) return project;
  const out = { ...project };
  if (typeof out.totalSize === "bigint") out.totalSize = Number(out.totalSize);
  if (out.status === "PENDING" || out.status === "PROCESSING") {
    // Lazy recovery: polling a job this process isn't handling re-schedules it.
    runner.ensureScheduled(project).catch(() => {});
    out.progress = runner.getProgress(project.id);
  }
  return out;
}

async function findOwned(req, select) {
  const project = await prisma.project.findFirst({
    where: { id: String(req.params.id), userId: req.user.id },
    ...(select ? { select } : {}),
  });
  if (!project) throw new HttpError(404, "Project not found.", "PROJECT_NOT_FOUND");
  return project;
}

function parseOr400(repoUrl) {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) throw new HttpError(400, "Enter a GitHub repository like https://github.com/owner/repo.", "INVALID_URL");
  return parsed;
}

/** Shared by validate + create: metadata, tree, ranked file selection. */
async function inspectRepo(repoUrl) {
  const { owner, repo } = parseOr400(repoUrl);
  const meta = await github.getRepoMeta(owner, repo);
  const { tree, truncated, commitSha } = await github.getTree(meta.owner, meta.repo, meta.defaultBranch);
  const selection = fileUtils.selectFiles(tree, {
    maxFiles: config.ingestion.maxFiles,
    maxFileBytes: config.ingestion.maxFileBytes,
  });
  if (selection.candidates.length === 0) {
    throw new HttpError(400, "No supported source files were found in this repository.", "NO_CODE");
  }
  return { meta, selection, truncated, commitSha };
}

async function validate(req, res) {
  const { meta, selection, truncated, commitSha } = await inspectRepo(req.body?.repoUrl);
  const existing = await prisma.project.findFirst({
    where: { userId: req.user.id, repoOwner: meta.owner, repoName: meta.repo, status: { not: "FAILED" } },
    select: { id: true, status: true },
  });
  const selectedPaths = new Set(selection.selected.map((f) => f.path));
  res.json({
    repo: meta,
    commitSha,
    truncated,
    totalFiles: selection.candidates.length,
    selectedCount: selection.selected.length,
    maxFiles: config.ingestion.maxFiles,
    languages: fileUtils.languageBreakdown(selection.selected),
    files: selection.candidates.map((f) => ({
      path: f.path,
      size: f.size,
      language: f.language,
      selected: selectedPaths.has(f.path),
    })),
    existingProjectId: existing?.id || null,
  });
}

async function create(req, res) {
  const { meta, selection } = await inspectRepo(req.body?.repoUrl);

  const existing = await prisma.project.findFirst({
    where: { userId: req.user.id, repoOwner: meta.owner, repoName: meta.repo, status: { not: "FAILED" } },
    select: { id: true, status: true },
  });
  if (existing) {
    return res.status(200).json({ projectId: existing.id, status: existing.status, existing: true });
  }

  const project = await prisma.project.create({
    data: {
      name: `${meta.owner}/${meta.repo}`,
      repoUrl: `https://github.com/${meta.owner}/${meta.repo}`,
      repoOwner: meta.owner,
      repoName: meta.repo,
      description: meta.description,
      stars: meta.stars,
      primaryLanguage: meta.primaryLanguage,
      defaultBranch: meta.defaultBranch,
      totalFiles: selection.candidates.length,
      fileCount: selection.selected.length,
      languages: fileUtils.languageBreakdown(selection.selected),
      status: "PENDING",
      stage: "queued",
      userId: req.user.id,
    },
  });
  runner.enqueue(project.id);
  return res.status(202).json({ projectId: project.id, status: "PENDING" });
}

async function list(req, res) {
  const projects = await prisma.project.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    select: LIST_FIELDS,
  });
  res.json(projects.map(serialize));
}

async function get(req, res) {
  const project = await findOwned(req);
  res.json(serialize(project));
}

async function status(req, res) {
  const project = await findOwned(req, {
    id: true,
    status: true,
    stage: true,
    fileCount: true,
    processedCount: true,
    chunkCount: true,
    errorMessage: true,
    attempts: true,
    startedAt: true,
    updatedAt: true,
  });
  res.json(serialize(project));
}

async function retry(req, res) {
  const project = await findOwned(req, { id: true, status: true });
  if (project.status !== "FAILED") {
    throw new HttpError(409, "Only failed projects can be retried.", "NOT_FAILED");
  }
  await prisma.project.update({
    where: { id: project.id },
    data: { status: "PENDING", stage: "queued", attempts: 0, errorMessage: null, startedAt: null, completedAt: null },
  });
  runner.enqueue(project.id);
  res.status(202).json({ projectId: project.id, status: "PENDING" });
}

async function remove(req, res) {
  const project = await findOwned(req, { id: true });
  runner.cancel(project.id);
  // FKs cascade, but vectors are the bulk of the data — delete them explicitly first.
  await prisma.$executeRaw`DELETE FROM "code_chunks" WHERE "projectId" = ${project.id}`;
  await prisma.project.delete({ where: { id: project.id } });
  res.json({ ok: true });
}

async function commits(req, res) {
  const project = await findOwned(req, { id: true });
  const rows = await prisma.commit.findMany({ where: { projectId: project.id }, orderBy: { date: "desc" } });
  res.json(rows);
}

/** File explorer: indexed files with summaries and chunk counts. */
async function files(req, res) {
  const project = await findOwned(req, { id: true, fileIndex: true });
  if (Array.isArray(project.fileIndex)) return res.json(project.fileIndex);
  // Legacy projects (indexed before fileIndex existed): derive from chunks.
  const rows = await prisma.$queryRaw`
    SELECT "filePath" AS path, MAX("language") AS language, COUNT(*)::int AS chunks
    FROM "code_chunks" WHERE "projectId" = ${project.id}
    GROUP BY "filePath" ORDER BY "filePath"`;
  res.json(rows.map((r) => ({ ...r, language: r.language || fileUtils.getLanguage(r.path), summary: null, symbols: [] })));
}

/** All chunks of one file — powers the "AST view" of how a file was split. */
async function fileChunks(req, res) {
  const project = await findOwned(req, { id: true });
  const filePath = typeof req.query.path === "string" ? req.query.path : "";
  if (!filePath) throw new HttpError(400, "Query parameter 'path' is required.");
  const chunks = await prisma.codeChunk.findMany({
    where: { projectId: project.id, filePath },
    orderBy: { chunkIndex: "asc" },
    select: { id: true, chunkIndex: true, content: true, summary: true, symbol: true, nodeType: true, startLine: true, endLine: true, language: true },
  });
  res.json({ path: filePath, chunks });
}

async function messages(req, res) {
  const project = await findOwned(req, { id: true });
  const rows = await prisma.chatMessage.findMany({
    where: { projectId: project.id, userId: req.user.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  res.json(rows);
}

async function clearMessages(req, res) {
  const project = await findOwned(req, { id: true });
  await prisma.chatMessage.deleteMany({ where: { projectId: project.id, userId: req.user.id } });
  res.json({ ok: true });
}

module.exports = { validate, create, list, get, status, retry, remove, commits, files, fileChunks, messages, clearMessages };
