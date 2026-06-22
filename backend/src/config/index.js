const dotenv = require("dotenv");
dotenv.config();

const requiredEnvVars = [
  "DATABASE_URL",
  "REDIS_URL",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "COOKIE_SECRET",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `[FATAL] Missing required environment variables: ${missingEnvVars.join(", ")}. Engine halting.`,
  );
}

module.exports = {
  port: process.env.BACKEND_PORT || 8000,
  env: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  githubToken: process.env.GITHUB_TOKEN || null,
  cookieSecret: process.env.COOKIE_SECRET,
  geminiDelayMs: parseInt(process.env.GEMINI_DELAY_MS || "4200", 10),
};
