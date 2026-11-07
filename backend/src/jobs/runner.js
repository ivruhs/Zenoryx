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

const HEARTBEAT_MS = 20_000;
const STALE_MS = 90_000; // no heartbeat for this long ⇒ the owning process is gone

const STAGE_ORDER = ["queued", "fetching", "parsing", "summarizing", "embedding", "commits", "done"];

function friendlyError(err) {
  const msg = err?.message || "Unknown error";
  if (/rate limit/i.test(msg)) return msg;
  if (err?.code === "EMBED_QUOTA_EXHAUSTED") return msg;
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
  if (err?.code === "GITHUB_RATE_LIMIT") return false; // resets hourly; fail fast with a clear message
  return true; // network blips, 429s, 5xx, timeouts
}

class JobRunner {
  constructor({ concurrency = 1 } = {}) {
    this.concurrency = concurrency;
    this.queue = [];
    this.running = new Map(); // projectId -> AbortController
    this.progress = new Map(); // projectId -> { stage, done, total, updatedAt }
    this.retryTimers = new Map(); // projectId -> backoff timer
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
    clearTimeout(this.retryTimers.get(projectId));
    this.retryTimers.delete(projectId);
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

  /** True if this process is already handling (queued, running or retry-waiting) the project. */
  knows(projectId) {
    return this.queue.includes(projectId) || this.running.has(projectId) || this.retryTimers.has(projectId);
  }

  async recover() {
    // Only take over PROCESSING rows whose heartbeat is stale: during a rolling
    // deploy the previous instance may still be working on a fresh one.
    const interrupted = await prisma.project.updateMany({
      where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - STALE_MS) } },
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

  /**
   * Lazy recovery, driven by status polls (no background DB polling, so Neon can
   * scale to zero): re-queue PENDING jobs this process doesn't know about, and
   * take over PROCESSING jobs whose owner stopped heart-beating.
   */
  async ensureScheduled(project) {
    if (this.stopped || !project || this.knows(project.id)) return;
    if (project.status === "PENDING") return this.enqueue(project.id);
    if (project.status === "PROCESSING" && project.updatedAt && Date.now() - new Date(project.updatedAt).getTime() > STALE_MS) {
      const res = await prisma.project.updateMany({
        where: { id: project.id, status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - STALE_MS) } },
        data: { status: "PENDING", stage: "queued" },
      });
      if (res.count) this.enqueue(project.id);
    }
  }

  tick() {
    while (!this.stopped && this.running.size < this.concurrency && this.queue.length > 0) {
      const id = this.queue.shift();
      // Reserve the slot synchronously — run() awaits before it can record itself.
      const controller = new AbortController();
      this.running.set(id, controller);
      this.run(id, controller).catch((err) => logger.error({ err, projectId: id }, "[runner] unexpected failure"));
    }
  }

  async run(projectId, controller) {
    let claimed;
    try {
      claimed = await prisma.project.updateMany({
        where: { id: projectId, status: "PENDING" },
        data: { status: "PROCESSING", stage: "fetching", startedAt: new Date(), errorMessage: null, attempts: { increment: 1 } },
      });
    } catch (err) {
      logger.warn({ projectId, err: err.message }, "[runner] claim failed; will retry on next poll");
      claimed = { count: 0 };
    }
    if (claimed.count === 0 || controller.signal.aborted) {
      if (claimed.count && this.stopped) await this.handBack(projectId);
      this.running.delete(projectId);
      if (!this.queue.includes(projectId)) this.progress.delete(projectId);
      return this.tick(); // deleted, cancelled, or claimed elsewhere
    }

    let lastStage = null;
    // Heartbeat: keeps updatedAt fresh so other instances know this job is alive.
    const heartbeat = setInterval(() => {
      prisma.project.updateMany({ where: { id: projectId, status: "PROCESSING" }, data: { stage: lastStage || "fetching" } }).catch(() => {});
    }, HEARTBEAT_MS);
    heartbeat.unref?.();

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
        await this.handBack(projectId);
      } else if (controller.signal.aborted || err?.code === "P2025") {
        logger.info({ projectId }, "[runner] job cancelled");
      } else {
        await this.handleFailure(projectId, err).catch((e) => logger.error({ err: e.message, projectId }, "[runner] failure handling failed"));
      }
    } finally {
      clearInterval(heartbeat);
      this.running.delete(projectId);
      this.tick();
    }
  }

  /** Shutdown: give the job back (and refund the attempt) so the next boot resumes it. */
  async handBack(projectId) {
    await prisma.project
      .updateMany({
        where: { id: projectId, status: "PROCESSING" },
        data: { status: "PENDING", stage: "queued", attempts: { decrement: 1 } },
      })
      .catch(() => {});
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
        this.retryTimers.delete(projectId);
        this.enqueue(projectId);
      }, delay);
      this.retryTimers.set(projectId, t);
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
    this.retryTimers.forEach(clearTimeout);
    this.retryTimers.clear();
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
