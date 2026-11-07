// Quota-aware LLM gateway over a pool of free-tier models.
//
// Free tiers are tight and per-model: Gemini chat models allow ~20 requests/day
// each, Groq models allow ~8K tokens/minute each. A single "primary + fallback"
// pair falls over quickly, so instead we keep a pool of routes (provider+model),
// each with its own token bucket:
//   * acquire()   — waits for RPM/TPM budget instead of firing into a 429
//   * cooldown    — a 429 parks the route (per-minute: retryDelay; per-day: hours)
//   * purpose     — interactive Q&A prefers Gemini (better answers, larger
//                   context); background ingestion prefers Groq (bigger daily
//                   budget), which saves Gemini's scarce daily quota for users.
//   * fitting     — prompts are built per route (`build(maxChars)`) so a request
//                   never exceeds that model's per-request token ceiling.
// Streaming only fails over before the first token, so answers never mix models.
const config = require("../config");
const logger = require("../lib/logger");

class LLMError extends Error {
  constructor(message, { status, retryAfterMs, provider, daily } = {}) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.provider = provider;
    this.daily = daily;
  }
}

const estimateTokens = (chars) => Math.ceil(chars / 3.2);
/** Abortable sleep that never leaks listeners and honours an already-aborted signal. */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const abortErr = () => Object.assign(new Error("aborted"), { name: "AbortError" });
    if (signal?.aborted) return reject(abortErr());
    const onAbort = () => {
      clearTimeout(t);
      reject(abortErr());
    };
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// ---------------------------------------------------------------------------
// Rolling-window limiter (requests + tokens per 60s) per route
// ---------------------------------------------------------------------------
class Bucket {
  constructor({ rpm, tpm }) {
    this.rpm = rpm;
    this.tpm = tpm;
    this.events = []; // { t, tokens }
  }
  prune(now) {
    while (this.events.length && now - this.events[0].t >= 60_000) this.events.shift();
  }
  /** ms until `tokens` fit in the window (0 = now). */
  waitFor(tokens) {
    const now = Date.now();
    this.prune(now);
    const used = this.events.reduce((n, e) => n + e.tokens, 0);
    if (this.events.length < this.rpm && used + tokens <= this.tpm) return 0;
    let freed = 0;
    for (const e of this.events) {
      freed += e.tokens;
      const reqOk = this.events.length - this.events.indexOf(e) - 1 < this.rpm;
      if (reqOk && used - freed + tokens <= this.tpm) return Math.max(0, e.t + 60_000 - now) + 50;
    }
    return 60_000;
  }
  take(tokens) {
    this.events.push({ t: Date.now(), tokens });
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function withTimeout(signal, ms) {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function ensureOk(res, route) {
  if (res.ok) return;
  const body = await res.text().catch(() => "");
  let message = body;
  let retryAfterMs;
  let daily = false;
  try {
    const parsed = JSON.parse(body);
    message = parsed.error?.message || body;
    for (const d of parsed.error?.details || []) {
      if (d["@type"]?.includes("RetryInfo") && d.retryDelay) retryAfterMs = Math.ceil(parseFloat(d.retryDelay) * 1000);
      if (d["@type"]?.includes("QuotaFailure")) daily ||= d.violations?.some((v) => /PerDay/i.test(v.quotaId || ""));
    }
  } catch {
    /* plain text */
  }
  const header = res.headers.get("retry-after");
  if (!retryAfterMs && header && !Number.isNaN(Number(header))) retryAfterMs = Number(header) * 1000;
  if (!retryAfterMs) {
    const m = /try again in ([\d.]+)s/i.exec(message);
    if (m) retryAfterMs = Math.ceil(parseFloat(m[1]) * 1000);
  }
  if (/per day|TPD|RPD/i.test(message)) daily = true;
  throw new LLMError(`${route.id} ${res.status}: ${String(message).slice(0, 240)}`, {
    status: res.status,
    retryAfterMs,
    provider: route.provider,
    daily,
  });
}

async function* sseData(body) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const part of body) {
    buffer += decoder.decode(part, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, "");
      buffer = buffer.slice(idx + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
  if (buffer.startsWith("data:")) yield buffer.slice(5).trim();
}

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------
const geminiAdapter = {
  body(model, { system, messages, json, maxTokens, temperature }) {
    return JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: "application/json" } : {}) },
    });
  },
  headers: () => ({ "content-type": "application/json", "x-goog-api-key": config.gemini.apiKey }),
  url: (model, action) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}`,
  async generate(route, opts) {
    const res = await fetch(this.url(route.model, "generateContent"), {
      method: "POST",
      headers: this.headers(),
      body: this.body(route.model, opts),
      signal: withTimeout(opts.signal, opts.timeoutMs || 45_000),
    });
    await ensureOk(res, route);
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    if (!text) throw new LLMError(`${route.id} returned an empty response`, { status: 502, provider: "gemini" });
    return text;
  },
  async stream(route, opts, onToken) {
    const res = await fetch(`${this.url(route.model, "streamGenerateContent")}?alt=sse`, {
      method: "POST",
      headers: this.headers(),
      body: this.body(route.model, opts),
      signal: withTimeout(opts.signal, opts.timeoutMs || 90_000),
    });
    await ensureOk(res, route);
    for await (const payload of sseData(res.body)) {
      if (!payload) continue;
      try {
        const text = (JSON.parse(payload).candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
        if (text) onToken(text);
      } catch {
        /* partial frame */
      }
    }
  },
};

const groqAdapter = {
  body(model, { system, messages, json, maxTokens, temperature }, stream = false) {
    const reasoning = /gpt-oss|qwen3/i.test(model);
    return JSON.stringify({
      model,
      messages: [...(system ? [{ role: "system", content: system }] : []), ...messages],
      temperature,
      max_completion_tokens: maxTokens + (reasoning ? 600 : 0),
      ...(/gpt-oss/i.test(model) ? { reasoning_effort: "low" } : {}),
      ...(/qwen3/i.test(model) ? { reasoning_effort: "none" } : {}),
      ...(json ? { response_format: { type: "json_object" } } : {}),
      stream,
    });
  },
  headers: () => ({ "content-type": "application/json", authorization: `Bearer ${config.groq.apiKey}` }),
  url: "https://api.groq.com/openai/v1/chat/completions",
  async generate(route, opts) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: this.body(route.model, opts),
      signal: withTimeout(opts.signal, opts.timeoutMs || 45_000),
    });
    await ensureOk(res, route);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    if (!text) throw new LLMError(`${route.id} returned an empty response`, { status: 502, provider: "groq" });
    return text;
  },
  async stream(route, opts, onToken) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: this.body(route.model, opts, true),
      signal: withTimeout(opts.signal, opts.timeoutMs || 90_000),
    });
    await ensureOk(res, route);
    for await (const payload of sseData(res.body)) {
      if (!payload || payload === "[DONE]") continue;
      try {
        const text = JSON.parse(payload).choices?.[0]?.delta?.content;
        if (text) onToken(text);
      } catch {
        /* partial frame */
      }
    }
  },
};

const ADAPTERS = { gemini: geminiAdapter, groq: groqAdapter };

// ---------------------------------------------------------------------------
// Route pool
// ---------------------------------------------------------------------------
function makeRoute(provider, model, limits) {
  return {
    id: `${provider}:${model}`,
    provider,
    model,
    // Max prompt size we will send in one request (keeps us under per-request TPM).
    maxInputChars: limits.maxInputChars,
    bucket: new Bucket(limits),
    cooldownUntil: 0,
  };
}

const list = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

function buildPool() {
  const routes = [];
  if (config.gemini.apiKey) {
    for (const m of list(config.gemini.chatModels)) routes.push(makeRoute("gemini", m, { rpm: 10, tpm: 200_000, maxInputChars: 60_000 }));
  }
  if (config.groq.apiKey) {
    for (const m of list(config.groq.chatModels)) routes.push(makeRoute("groq", m, { rpm: 25, tpm: 7_500, maxInputChars: 13_000 }));
  }
  return routes;
}
let pool = buildPool();

function ordered(purpose) {
  const preferGroq = purpose === "batch";
  const rank = (r) => (r.provider === (preferGroq ? "groq" : "gemini") ? 0 : 1);
  return [...pool].sort((a, b) => rank(a) - rank(b) || pool.indexOf(a) - pool.indexOf(b));
}

function park(route, err) {
  const ms = err.daily ? 60 * 60_000 : err.retryAfterMs ? err.retryAfterMs + 250 : err.status === 429 ? 20_000 : 15_000;
  route.cooldownUntil = Date.now() + ms;
  logger.warn(
    { route: route.id, status: err.status, daily: Boolean(err.daily), cooldownMs: ms },
    `[llm] ${route.id} unavailable: ${String(err.message).slice(0, 140)}`,
  );
}

/**
 * Picks the first route that can take the request within `maxWaitMs`, waiting
 * for its token bucket if needed. Returns null when none can.
 */
async function acquire(routes, tokensFor, { maxWaitMs, signal }) {
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    let best = null;
    for (const r of routes) {
      if (r.cooldownUntil > Date.now()) continue;
      const wait = r.bucket.waitFor(tokensFor(r));
      if (wait === 0) {
        r.bucket.take(tokensFor(r));
        return r;
      }
      if (!best || wait < best.wait) best = { r, wait };
    }
    const soonestCooldown = Math.min(...routes.map((r) => (r.cooldownUntil > Date.now() ? r.cooldownUntil - Date.now() : Infinity)));
    const wait = Math.min(best ? best.wait : Infinity, soonestCooldown);
    if (!Number.isFinite(wait) || Date.now() + wait > deadline) return null;
    await sleep(Math.min(wait, 5_000), signal);
  }
}

function prepare(opts, route) {
  const messages = opts.build ? opts.build(route.maxInputChars) : opts.messages;
  const chars = (opts.system?.length || 0) + messages.reduce((n, m) => n + m.content.length, 0);
  return { ...opts, messages, estTokens: estimateTokens(chars) + (opts.maxTokens || 1024) + (route.provider === "groq" ? 600 : 0) };
}

async function run(mode, opts, onToken, { purpose = "interactive", maxWaitMs } = {}) {
  const defaults = { maxTokens: 1024, temperature: 0.2 };
  opts = { ...defaults, ...opts };
  const routes = ordered(purpose);
  if (!routes.length) throw new LLMError("No LLM provider is configured.", { status: 503 });
  const budgetMs = maxWaitMs ?? (purpose === "batch" ? 120_000 : 15_000);
  const tried = new Set();
  let lastErr;

  for (;;) {
    const candidates = routes.filter((r) => !tried.has(r));
    if (!candidates.length) break;
    const route = await acquire(candidates, (r) => prepare(opts, r).estTokens, { maxWaitMs: budgetMs, signal: opts.signal });
    if (!route) break;
    tried.add(route);
    const prepared = prepare(opts, route);
    let emitted = false;
    try {
      const adapter = ADAPTERS[route.provider];
      if (mode === "stream") {
        await adapter.stream(route, prepared, (t) => {
          emitted = true;
          onToken(t);
        });
        // A 200 with zero tokens (safety block, exhausted reasoning budget…) is a failure: fail over.
        if (!emitted) throw new LLMError(`${route.id} returned an empty stream`, { status: 502, provider: route.provider });
        return { provider: route.provider, model: route.model };
      }
      const text = await adapter.generate(route, prepared);
      return { text, provider: route.provider, model: route.model };
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      lastErr = err;
      if (err.status === 413) route.maxInputChars = Math.floor(route.maxInputChars * 0.7);
      park(route, err);
      if (emitted) throw err;
    }
  }
  throw (
    lastErr ||
    new LLMError("All free-tier AI models are busy right now. Please try again shortly.", { status: 429, provider: "pool" })
  );
}

/** Single completion. opts: { system, messages | build(maxChars), maxTokens, temperature, json, signal } */
const generate = (opts, routing) => run("generate", opts, null, routing);

/** JSON completion (tolerates fenced output). */
async function generateJson(opts, routing) {
  const res = await generate({ ...opts, json: true }, routing);
  const cleaned = res.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    return { ...res, data: JSON.parse(cleaned) };
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) return { ...res, data: JSON.parse(m[0]) };
    throw new LLMError("Model did not return valid JSON", { status: 502, provider: res.provider });
  }
}

/** Streams tokens, failing over only before the first token. */
const stream = (opts, onToken, routing) => run("stream", opts, onToken, routing);

function poolStatus() {
  return pool.map((r) => ({ id: r.id, coolingMs: Math.max(0, r.cooldownUntil - Date.now()) }));
}

module.exports = {
  generate,
  generateJson,
  stream,
  poolStatus,
  LLMError,
  estimateTokens,
  Bucket,
  _reset: () => (pool = buildPool()),
};
