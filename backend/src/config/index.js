// Centralised, validated configuration. Every tunable lives here so the app can
// be re-pointed at new (free-tier) models without touching code.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const required = ["DATABASE_URL", "COOKIE_SECRET"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(`[config] Missing required environment variables: ${missing.join(", ")}`);
}
if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
  throw new Error("[config] At least one LLM provider key (GEMINI_API_KEY or GROQ_API_KEY) is required.");
}
if (!process.env.GEMINI_API_KEY) {
  // Embeddings are Gemini-only; without it ingestion cannot run.
  // eslint-disable-next-line no-console
  console.warn("[config] GEMINI_API_KEY missing — embeddings (and therefore ingestion) are disabled.");
}

const int = (key, fallback) => {
  const v = parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};

const env = process.env.NODE_ENV || "development";

module.exports = {
  env,
  isProd: env === "production",
  port: int("PORT", int("BACKEND_PORT", 8000)),
  // Comma-separated list of allowed browser origins (only needed when the frontend
  // calls the API cross-origin; the Next.js proxy makes requests same-origin).
  corsOrigins: (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL,
  cookieSecret: process.env.COOKIE_SECRET,
  // Set COOKIE_CROSS_SITE=true only if the browser talks to the API on a different
  // site (no proxy). Requires HTTPS and is blocked by Safari's ITP.
  cookieCrossSite: process.env.COOKIE_CROSS_SITE === "true",

  githubToken: process.env.GITHUB_TOKEN || null,
  trustProxy: int("TRUST_PROXY", 1),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || null,
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
    // Pool of chat models — each free-tier model has its OWN daily quota, so the
    // gateway rotates through them. Comma-separated, in preference order.
    chatModels: process.env.GEMINI_CHAT_MODELS || "gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-2.5-flash-lite",
    embeddingDims: 3072, // must match vector(3072) in the schema
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || null,
    chatModels: process.env.GROQ_CHAT_MODELS || "openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b",
  },

  ingestion: {
    maxFiles: int("MAX_FILES", 36), // files indexed per repository (top-ranked)
    maxFileBytes: int("MAX_FILE_BYTES", 200 * 1024),
    maxChunks: int("MAX_CHUNKS", 180), // hard ceiling per project (free-tier embedding quota)
    maxAttempts: int("MAX_ATTEMPTS", 3),
    commitCount: int("COMMIT_COUNT", 6),
  },
  qa: {
    perHourLimit: int("QA_PER_HOUR", 40),
  },
};
