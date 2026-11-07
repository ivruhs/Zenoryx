// Durable, Postgres-backed job runner (replaces BullMQ + Redis).
//
// Why: the project runs entirely on free tiers. A Redis queue meant a second
// service to keep alive (Upstash deletes idle free databases) and constant
// polling that burns its command quota. Postgres already stores each project's
// status, so it doubles as the queue:
//   * enqueue  → row is PENDING; the runner is poked in-process (no polling).
//   * claim    → atomic `UPDATE … WHERE status='PENDING'` so two instances can
//                never process the same project.
//   * recover  → on boot, interrupted PROCESSING rows go back to PENDING and every
//                PENDING row is re-queued, so a restart/redeploy loses nothing.
//   * retry    → exponential backoff for transient failures, up to maxAttempts.
const prisma = require("../prisma/client");
const config = require("../config");
const logger = require("../lib/logger");
const { runIngestion } = require("./ingest");

const STAGE_ORDER = ["queued", "fetching", "parsing", "summarizing", "embedding", "commits", "done"];

function friendlyError(err) {
  const msg = err?.message || "Unknown error";
  if (/rate limit/i.test(msg)) return msg;
  if (/GEMINI|embedding/i.test(msg) && /429|quota/i.test(msg)) {
    return "The free embedding quota is exhausted for now. Please retry in a few minutes.";
  }
  return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
}

function isRetryable(err) {
  if (err?.retryable === false) return false;
  if (err?.retryable === true) return true;
  const status = err?.status;
  if ([400, 401, 403, 404].includes(status)) return false;
  return true; // network blips, 429s, 5xx, timeouts
}

class JobRunner {
  constructor({ concurrency = 1 } = {}) {
    this.concurrency = concurrency;
    this.queue = [];
    this.running = new Map(); // projectId -> AbortController
    this.progress = new Map(); // projectId -> { stage, done, total, updatedAt }
    this.timers = new Set();
    this.stopped = false;
  }

  enqueue(projectId) {
    if (this.stopped || this.queue.includes(projectId) || this.running.has(projectId)) return;
    this.queue.push(projectId);
    this.progress.set(projectId, { stage: "queued", done: 0, total: 0, updatedAt: Date.now() });
    setImmediate(() => this.tick());
  }

  /** Stops a queued or running job (used when a project is deleted). */
  cancel(projectId) {
    this.queue = this.queue.filter((id) => id !== projectId);
    this.running.get(projectId)?.abort();
    this.progress.delete(projectId);
  }

  getProgress(projectId) {
    const p = this.progress.get(projectId);
    if (!p) return null;
    const queuePosition = this.queue.indexOf(projectId);
    return { ...p, queuePosition: queuePosition >= 0 ? queuePosition + 1 : 0 };
  }

  stats() {
    return { running: [...this.running.keys()].length, queued: this.queue.length };
  }

  async recover() {
    const interrupted = await prisma.project.updateMany({
      where: { status: "PROCESSING" },
      data: { status: "PENDING", stage: "queued" },
    });
    const pending = await prisma.project.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    pending.forEach((p) => this.enqueue(p.id));
    if (interrupted.count || pending.length) {
      logger.info({ interrupted: interrupted.count, queued: pending.length }, "[runner] recovered pending jobs");
    }
  }

  tick() {
    while (!this.stopped && this.running.size < this.concurrency && this.queue.length > 0) {
      const id = this.queue.shift();
      this.run(id).catch((err) => logger.error({ err, projectId: id }, "[runner] unexpected failure"));
    }
  }

  async run(projectId) {
    const claimed = await prisma.project.updateMany({
      where: { id: projectId, status: "PENDING" },
      data: { status: "PROCESSING", stage: "fetching", startedAt: new Date(), errorMessage: null, attempts: { increment: 1 } },
    });
    if (claimed.count === 0) {
      this.progress.delete(projectId);
      return this.tick(); // deleted, or claimed elsewhere
    }

    const controller = new AbortController();
    this.running.set(projectId, controller);
    let lastStage = null;

    const report = async (stage, done = 0, total = 0) => {
      this.progress.set(projectId, { stage, done, total, updatedAt: Date.now() });
      if (stage !== lastStage) {
        lastStage = stage;
        await prisma.project.update({ where: { id: projectId }, data: { stage } }).catch(() => {});
      }
    };

    try {
      await runIngestion(projectId, { signal: controller.signal, report });
      this.progress.delete(projectId);
    } catch (err) {
      if (controller.signal.aborted && this.stopped) {
        // Shutdown: hand the job back so the next boot resumes it.
        await prisma.project
          .updateMany({ where: { id: projectId, status: "PROCESSING" }, data: { status: "PENDING", stage: "queued" } })
          .catch(() => {});
      } else if (controller.signal.aborted || err?.code === "P2025") {
        logger.info({ projectId }, "[runner] job cancelled");
      } else {
        await this.handleFailure(projectId, err);
      }
    } finally {
      this.running.delete(projectId);
      this.tick();
    }
  }

  async handleFailure(projectId, err) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { attempts: true } });
    if (!project) return;
    const canRetry = isRetryable(err) && project.attempts < config.ingestion.maxAttempts;
    logger.warn({ projectId, attempt: project.attempts, retry: canRetry, err: err.message }, "[runner] ingestion attempt failed");

    if (canRetry) {
      const delay = 5000 * 2 ** (project.attempts - 1);
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "PENDING", stage: "queued", errorMessage: `Retrying after error: ${friendlyError(err)}` },
      });
      this.progress.set(projectId, { stage: "queued", done: 0, total: 0, retryInMs: delay, updatedAt: Date.now() });
      const t = setTimeout(() => {
        this.timers.delete(t);
        this.enqueue(projectId);
      }, delay);
      this.timers.add(t);
    } else {
      this.progress.delete(projectId);
      await prisma.project
        .update({ where: { id: projectId }, data: { status: "FAILED", errorMessage: friendlyError(err) } })
        .catch(() => {});
    }
  }

  /** Graceful shutdown: abort in-flight work and wait briefly for it to unwind. */
  async stop(timeoutMs = 8000) {
    this.stopped = true;
    this.timers.forEach(clearTimeout);
    this.queue = [];
    const running = [...this.running.values()];
    running.forEach((c) => c.abort());
    const deadline = Date.now() + timeoutMs;
    while (this.running.size > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

const runner = new JobRunner({ concurrency: 1 });

module.exports = { runner, JobRunner, STAGE_ORDER, isRetryable, friendlyError };
