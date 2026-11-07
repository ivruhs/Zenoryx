#!/usr/bin/env node
// `npm run doctor` — checks every external dependency the app needs, on free tiers.
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "silent";
const config = require("../src/config");

const ok = (m) => console.log(`  \x1b[32m✔\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✘\x1b[0m ${m}`);
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);

(async () => {
  console.log("\nZenoryx doctor\n");
  let failures = 0;

  try {
    const prisma = require("../src/prisma/client");
    const [{ v }] = await prisma.$queryRaw`SELECT extversion AS v FROM pg_extension WHERE extname = 'vector'`;
    const pending = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NULL`;
    ok(`Postgres reachable · pgvector ${v}${pending[0].n ? " · UNFINISHED MIGRATIONS" : ""}`);
    await prisma.$disconnect();
  } catch (e) {
    failures++;
    bad(`Postgres: ${e.message.split("\n").pop()}`);
  }

  // Probe every model in the pool directly (each free-tier model has its own quota).
  const pools = [
    ["gemini", config.gemini.apiKey, config.gemini.chatModels],
    ["groq", config.groq.apiKey, config.groq.chatModels],
  ];
  for (const [provider, key, models] of pools) {
    if (!key) {
      warn(`${provider}: no API key configured`);
      continue;
    }
    let healthy = 0;
    for (const model of models.split(",").map((m) => m.trim()).filter(Boolean)) {
      const res =
        provider === "gemini"
          ? await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
              method: "POST",
              headers: { "content-type": "application/json", "x-goog-api-key": key },
              body: JSON.stringify({ contents: [{ parts: [{ text: "Reply OK" }] }], generationConfig: { maxOutputTokens: 5 } }),
            })
          : await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
              body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply OK" }], max_completion_tokens: 64 }),
            });
      const body = await res.text();
      if (res.ok) {
        healthy++;
        ok(`${provider} · ${model}`);
      } else if (res.status === 429) {
        warn(`${provider} · ${model}: free quota exhausted for now (${/PerDay|per day/i.test(body) ? "daily" : "per-minute"})`);
      } else {
        bad(`${provider} · ${model}: HTTP ${res.status} ${body.slice(0, 120)}`);
      }
    }
    if (!healthy) failures++;
  }

  try {
    const v = await require("../src/services/embedding.service").embedQuery("doctor check");
    ok(`gemini embeddings · ${config.gemini.embeddingModel} · ${v.length} dims`);
  } catch (e) {
    failures++;
    bad(`embeddings: ${e.message.slice(0, 160)}`);
  }

  try {
    const headers = config.githubToken ? { authorization: `Bearer ${config.githubToken}` } : {};
    let res = await fetch("https://api.github.com/rate_limit", { headers });
    if (res.status === 401) {
      warn("GITHUB_TOKEN is invalid or expired — the app will fall back to anonymous access");
      res = await fetch("https://api.github.com/rate_limit");
    }
    const { rate } = await res.json();
    ok(`GitHub API · ${rate.remaining}/${rate.limit} requests left this hour${config.githubToken ? "" : " (anonymous)"}`);
  } catch (e) {
    failures++;
    bad(`GitHub: ${e.message}`);
  }

  console.log(failures ? `\n${failures} check(s) failed.\n` : "\nAll systems go.\n");
  process.exit(failures ? 1 : 0);
})();
