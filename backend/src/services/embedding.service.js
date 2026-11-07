// Gemini embeddings (free tier) with batching, retry and a tiny query cache.
//
// The previous implementation embedded one chunk per request with a fixed 4.2s
// sleep between calls. batchEmbedContents sends up to 100 texts per request, so a
// 300-chunk repository needs a handful of calls instead of 300.
const config = require("../config");
const logger = require("../lib/logger");

const BATCH_SIZE = 32;
const MAX_INPUT_CHARS = 3000; // signature + docstring + opening logic carry most of the meaning
const MAX_ATTEMPTS = 6;

// Free tier counts every text in a batch as a request. Pace batches through a
// rolling 60s window so we wait for budget instead of collecting 429s.
const EMBED_RPM = parseInt(process.env.EMBED_RPM || "90", 10);
const EMBED_TPM = parseInt(process.env.EMBED_TPM || "28000", 10);
const recent = []; // { t, n, tokens }
function waitForBudget(n, tokens) {
  const now = Date.now();
  while (recent.length && now - recent[0].t >= 60_000) recent.shift();
  const usedN = recent.reduce((a, e) => a + e.n, 0);
  const usedT = recent.reduce((a, e) => a + e.tokens, 0);
  if (usedN + n <= EMBED_RPM && usedT + tokens <= EMBED_TPM) return 0;
  let freedN = 0;
  let freedT = 0;
  for (const e of recent) {
    freedN += e.n;
    freedT += e.tokens;
    if (usedN - freedN + n <= EMBED_RPM && usedT - freedT + tokens <= EMBED_TPM) return e.t + 60_000 - now + 50;
  }
  return 60_000;
}

class QuotaExhaustedError extends Error {
  constructor() {
    super("The free Gemini embedding quota for today is used up. It resets daily — please try again later.");
    this.status = 429;
    this.retryable = false;
    this.expose = true;
  }
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    }, { once: true });
  });

function endpoint() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.embeddingModel}:batchEmbedContents`;
}

async function requestBatch(texts, taskType, signal) {
  const model = `models/${config.gemini.embeddingModel}`;
  const tokens = texts.reduce((n, t) => n + Math.ceil(Math.min(t.length, MAX_INPUT_CHARS) / 3.2), 0);
  for (let wait = waitForBudget(texts.length, tokens); wait > 0; wait = waitForBudget(texts.length, tokens)) {
    await sleep(Math.min(wait, 5000), signal);
  }
  recent.push({ t: Date.now(), n: texts.length, tokens });
  const body = JSON.stringify({
    requests: texts.map((text) => ({
      model,
      taskType,
      content: { parts: [{ text: text.slice(0, MAX_INPUT_CHARS) || " " }] },
    })),
  });

  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(endpoint(), {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": config.gemini.apiKey },
        body,
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
      });
    } catch (err) {
      if (signal?.aborted || attempt >= MAX_ATTEMPTS) throw err;
      await sleep(1000 * 2 ** attempt, signal);
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const vectors = (data.embeddings || []).map((e) => e.values);
      if (vectors.length !== texts.length || vectors.some((v) => !Array.isArray(v) || v.length !== config.gemini.embeddingDims)) {
        throw new Error(`Embedding response malformed (${vectors.length}/${texts.length} vectors)`);
      }
      return vectors;
    }

    const text = await res.text().catch(() => "");
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      const msg = (() => {
        try {
          return JSON.parse(text).error?.message;
        } catch {
          return text;
        }
      })();
      const err = new Error(`Gemini embedding failed (${res.status}): ${String(msg).slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 429 && /PerDay/i.test(text)) throw new QuotaExhaustedError();
    const hinted = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(text);
    const wait = hinted ? Math.ceil(Number(hinted[1]) * 1000) + 250 : Math.min(60_000, 1500 * 2 ** attempt);
    const quota = /"quotaId":\s*"([^"]+)"/.exec(text)?.[1];
    logger.warn({ status: res.status, attempt, waitMs: wait, quota }, "[embed] rate limited, backing off");
    await sleep(wait, signal);
  }
}

/**
 * Embeds many documents. Calls `onProgress(done, total)` after each batch.
 * @returns {Promise<number[][]>}
 */
async function embedDocuments(texts, { signal, onProgress } = {}) {
  if (!config.gemini.apiKey) throw new Error("GEMINI_API_KEY is required for embeddings.");
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    out.push(...(await requestBatch(batch, "RETRIEVAL_DOCUMENT", signal)));
    onProgress?.(Math.min(i + BATCH_SIZE, texts.length), texts.length);
  }
  return out;
}

const queryCache = new Map();
async function embedQuery(text, { signal } = {}) {
  if (!config.gemini.apiKey) throw new Error("GEMINI_API_KEY is required for embeddings.");
  const key = text.trim().toLowerCase();
  if (queryCache.has(key)) return queryCache.get(key);
  const [vector] = await requestBatch([text], "RETRIEVAL_QUERY", signal);
  queryCache.set(key, vector);
  if (queryCache.size > 500) queryCache.delete(queryCache.keys().next().value);
  return vector;
}

module.exports = { embedDocuments, embedQuery, QuotaExhaustedError };
