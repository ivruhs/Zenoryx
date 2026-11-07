// The ingestion pipeline: GitHub → Tree-sitter → LLM summaries → embeddings → pgvector.
//
// Stages (persisted on the project row so the UI can render a live pipeline):
//   fetching     resolve default branch, pin the commit sha, list the tree, rank files
//   parsing      download files from the raw CDN and split them into AST chunks
//   summarizing  one LLM call per *group* of files (not per chunk) → file + chunk summaries
//   embedding    batched Gemini embeddings (32 texts per request)
//   commits      recent commits with AI-written diff summaries (best-effort)
const crypto = require("crypto");
const { Prisma } = require("@prisma/client");
const prisma = require("../prisma/client");
const config = require("../config");
const logger = require("../lib/logger");
const chunker = require("../lib/chunker");
const fileUtils = require("../lib/fileUtils");
const github = require("../services/github.service");
const llm = require("../services/llm.service");
const embeddings = require("../services/embedding.service");

class PipelineError extends Error {
  constructor(message, { retryable = false } = {}) {
    super(message);
    this.retryable = retryable;
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    const err = new Error("Ingestion cancelled");
    err.name = "AbortError";
    throw err;
  }
}

/** Runs `fn` over items with bounded concurrency, preserving order. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

const SUMMARY_GROUP_CHARS = 8_500; // fits one Groq free-tier request (8K TPM incl. output)
const DIGEST_CODE_CHARS = 1_400;

const NODE_WORDS = {
  module: "module-level code",
  window: "code section",
  group: "related declarations",
  lexical_declaration: "declaration",
  variable_declaration: "declaration",
};

/** Deterministic, honest chunk description (no LLM call per chunk). */
function structuralSummary(file, chunk) {
  const kind = NODE_WORDS[chunk.nodeType] || (chunk.nodeType || "code").replace(/_/g, " ");
  const what = chunk.symbol ? `${chunk.symbol} (${kind})` : kind.charAt(0).toUpperCase() + kind.slice(1);
  return `${what} in ${file.path}, lines ${chunk.startLine}–${chunk.endLine}.`;
}

/** Compact view of a file for summarization: symbols + the opening of the code. */
function fileDigest(f) {
  const symbols = [...new Set(f.chunks.map((c) => c.symbol).filter(Boolean))].slice(0, 20);
  const head = f.chunks.map((c) => c.content).join("\n").slice(0, DIGEST_CODE_CHARS);
  return `## ${f.path}\n${symbols.length ? `symbols: ${symbols.join(", ")}\n` : ""}\`\`\`\n${head}\n\`\`\``;
}

/**
 * One LLM call per *group* of files → a 1–2 sentence role summary per file.
 * Routed to the Groq pool first (largest free daily budget), so Gemini's small
 * per-day quota stays available for interactive questions.
 */
async function summarizeFiles(files, { signal, onProgress }) {
  const groups = [];
  let current = [];
  let size = 0;
  for (const f of files) {
    const digest = fileDigest(f);
    if (current.length && size + digest.length > SUMMARY_GROUP_CHARS) {
      groups.push(current);
      current = [];
      size = 0;
    }
    current.push({ f, digest });
    size += digest.length;
  }
  if (current.length) groups.push(current);

  const system =
    "You document codebases for engineers. For each file, write 1-2 concrete sentences on its responsibility: " +
    "name key functions/classes, inputs/outputs, side effects and libraries. Never speculate beyond the code shown.";

  let done = 0;
  await mapLimit(groups, 2, async (group) => {
    throwIfAborted(signal);
    const prompt =
      'Return JSON exactly shaped as {"files":[{"path":string,"summary":string}]} with one entry per file below, same paths.\n\n' +
      group.map((g) => g.digest).join("\n\n");
    try {
      const { data } = await llm.generateJson(
        { system, messages: [{ role: "user", content: prompt }], maxTokens: 70 * group.length + 150, temperature: 0.1, signal },
        { purpose: "batch", maxWaitMs: 90_000 },
      );
      const byPath = new Map((data.files || []).map((x) => [x.path, x.summary]));
      group.forEach(({ f }, i) => {
        const s = byPath.get(f.path) ?? data.files?.[i]?.summary;
        f.summary = typeof s === "string" && s.trim() ? s.trim() : null;
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      logger.warn({ err: err.message, files: group.length }, "[ingest] file summaries unavailable for a group; continuing");
    }
    done += group.length;
    onProgress(done, files.length);
  });

  for (const f of files) for (const c of f.chunks) c.summary = structuralSummary(f, c);
}

function diffStats(diff) {
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }
  return { additions, deletions };
}

async function ingestCommits(project, { signal }) {
  const commits = await github.getCommits(project.repoOwner, project.repoName, config.ingestion.commitCount);
  const rows = await mapLimit(commits, 2, async (c) => {
    throwIfAborted(signal);
    let diff = "";
    try {
      diff = await github.getCommitDiff(project.repoOwner, project.repoName, c.sha);
    } catch (err) {
      logger.debug({ err: err.message }, "[ingest] diff unavailable");
    }
    let aiSummary = c.commit.message.split("\n")[0];
    if (diff) {
      try {
        const { text } = await llm.generate(
          {
            messages: [
              {
                role: "user",
                content:
                  "Summarize this git diff in 1–2 plain sentences, past tense, focusing on behaviour " +
                  `(not file names). Commit message: "${c.commit.message.slice(0, 200)}"\n\n${diff.slice(0, 7000)}`,
              },
            ],
            maxTokens: 160,
            temperature: 0.1,
            signal,
          },
          { purpose: "batch", maxWaitMs: 60_000 },
        );
        aiSummary = text.trim();
      } catch (err) {
        if (signal?.aborted) throw err;
      }
    }
    return {
      sha: c.sha,
      message: c.commit.message.slice(0, 2000),
      authorName: c.commit.author?.name || c.author?.login || "unknown",
      authorEmail: c.commit.author?.email || "",
      date: new Date(c.commit.author?.date || c.commit.committer?.date || Date.now()),
      aiSummary,
      ...diffStats(diff),
      projectId: project.id,
    };
  });
  await prisma.commit.deleteMany({ where: { projectId: project.id } });
  await prisma.commit.createMany({ data: rows, skipDuplicates: true });
}

async function insertChunks(projectId, chunks) {
  const ROWS_PER_STATEMENT = 20;
  for (let i = 0; i < chunks.length; i += ROWS_PER_STATEMENT) {
    const values = chunks.slice(i, i + ROWS_PER_STATEMENT).map(
      (c) => Prisma.sql`(${crypto.randomUUID()}, ${c.filePath}, ${c.chunkIndex}, ${c.summary}, ${c.content},
        ${`[${c.embedding.join(",")}]`}::vector, ${projectId}, ${c.language}, ${c.symbol}, ${c.nodeType},
        ${c.startLine}, ${c.endLine})`,
    );
    await prisma.$executeRaw`
      INSERT INTO "code_chunks"
        ("id","filePath","chunkIndex","summary","content","embedding","projectId","language","symbol","nodeType","startLine","endLine")
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("projectId","filePath","chunkIndex") DO NOTHING`;
  }
}

/**
 * Executes the full pipeline for one project.
 * @param {string} projectId
 * @param {{ signal?: AbortSignal, report: (stage:string, done?:number, total?:number) => void }} ctx
 */
async function runIngestion(projectId, { signal, report }) {
  const started = Date.now();
  let project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new PipelineError("Project no longer exists");

  // ---- fetching ----------------------------------------------------------
  await report("fetching");
  const meta = await github.getRepoMeta(project.repoOwner, project.repoName);
  const { commitSha, tree } = await github.getTree(meta.owner, meta.repo, meta.defaultBranch);
  const { candidates, selected } = fileUtils.selectFiles(tree, {
    maxFiles: config.ingestion.maxFiles,
    maxFileBytes: config.ingestion.maxFileBytes,
  });
  if (selected.length === 0) throw new PipelineError("No supported source files were found in this repository.");

  project = await prisma.project.update({
    where: { id: projectId },
    data: {
      description: meta.description,
      stars: meta.stars,
      primaryLanguage: meta.primaryLanguage,
      defaultBranch: meta.defaultBranch,
      commitSha,
      totalFiles: candidates.length,
      fileCount: selected.length,
      processedCount: 0,
      languages: fileUtils.languageBreakdown(selected),
    },
  });
  // A retry starts from a clean slate: chunks are cheap to recompute now.
  await prisma.$executeRaw`DELETE FROM "code_chunks" WHERE "projectId" = ${projectId}`;
  throwIfAborted(signal);

  // ---- parsing -----------------------------------------------------------
  await report("parsing", 0, selected.length);
  // Highest-ranked files first so the chunk budget is spent where it matters.
  const ranked = [...selected].sort((a, b) => b.score - a.score);
  let parsedCount = 0;
  let totalBytes = 0;
  let failedDownloads = 0;
  const files = await mapLimit(ranked, 6, async (f) => {
    throwIfAborted(signal);
    let content = await github.getRawFile(meta.owner, meta.repo, commitSha, f.path);
    if (content === null) {
      failedDownloads++;
      content = "";
    }
    totalBytes += Buffer.byteLength(content, "utf8");
    const chunks = content ? chunker.chunkCode(content, f.language) : [];
    parsedCount++;
    report("parsing", parsedCount, selected.length);
    return { ...f, chunks };
  });

  // Transient download failures (CDN throttling) must not silently produce a
  // partial index — retry the whole job instead.
  if (failedDownloads > Math.max(2, ranked.length * 0.25)) {
    throw new PipelineError(`GitHub's file CDN failed for ${failedDownloads} of ${ranked.length} files (likely throttling). Retrying shortly.`, {
      retryable: true,
    });
  }
  if (failedDownloads) logger.warn({ projectId, failedDownloads }, "[ingest] some files could not be downloaded");

  let budget = config.ingestion.maxChunks;
  const indexed = [];
  for (const f of files) {
    if (!f.chunks.length || budget <= 0) continue;
    f.chunks = f.chunks.slice(0, budget);
    budget -= f.chunks.length;
    indexed.push(f);
  }
  const allChunks = indexed.flatMap((f) => f.chunks);
  if (allChunks.length === 0) throw new PipelineError("Files were downloaded but contained no indexable code.");
  await prisma.project.update({
    where: { id: projectId },
    data: { processedCount: selected.length, totalSize: BigInt(totalBytes) },
  });

  // ---- summarizing -------------------------------------------------------
  await report("summarizing", 0, indexed.length);
  await summarizeFiles(indexed, { signal, onProgress: (d, t) => report("summarizing", d, t) });
  throwIfAborted(signal);

  // ---- embedding ---------------------------------------------------------
  await report("embedding", 0, allChunks.length);
  const rows = indexed.flatMap((f) =>
    f.chunks.map((c) => ({
      ...c,
      filePath: f.path,
      language: f.language,
      embedText:
        `File: ${f.path}\n` +
        (f.summary ? `File role: ${f.summary}\n` : "") +
        (c.symbol ? `Symbol: ${c.symbol} (${c.nodeType})\n` : "") +
        `Lines: ${c.startLine}-${c.endLine}\n\n${c.content}`,
    })),
  );
  const vectors = await embeddings.embedDocuments(
    rows.map((r) => r.embedText),
    { signal, onProgress: (d, t) => report("embedding", d, t) },
  );
  rows.forEach((r, i) => (r.embedding = vectors[i]));
  throwIfAborted(signal);
  await insertChunks(projectId, rows);

  const fileIndex = indexed
    .map((f) => ({
      path: f.path,
      language: f.language,
      size: f.size,
      summary: f.summary || null,
      chunks: f.chunks.length,
      symbols: f.chunks.map((c) => c.symbol).filter(Boolean).slice(0, 12),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  // ---- commits (best effort) ---------------------------------------------
  await report("commits");
  try {
    await ingestCommits(project, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    logger.warn({ err: err.message, projectId }, "[ingest] commit timeline skipped");
  }

  // ---- done --------------------------------------------------------------
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: "READY",
      stage: "done",
      errorMessage: null,
      chunkCount: rows.length,
      fileIndex,
      completedAt: new Date(),
    },
  });
  logger.info({ projectId, files: indexed.length, chunks: rows.length, ms: Date.now() - started }, "[ingest] completed");
}

module.exports = { runIngestion, PipelineError, mapLimit, diffStats };
