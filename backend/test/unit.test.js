// Pure-logic unit tests (no network, no database). Run: npm test
process.env.LOG_LEVEL = "silent";
const test = require("node:test");
const assert = require("node:assert/strict");

const { parseRepoUrl } = require("../src/lib/githubUrl");
const fileUtils = require("../src/lib/fileUtils");
const { chunkCode } = require("../src/lib/chunker");
const { signCookie, verifyCookie } = require("../src/auth/crypto");
const { extractTerms, lexicalScore } = require("../src/services/vector.service");
const { normalizeHistory, buildContext } = require("../src/controllers/qa.controller");
const { diffStats, mapLimit } = require("../src/jobs/ingest");
const { isRetryable, JobRunner } = require("../src/jobs/runner");
const { Bucket, estimateTokens } = require("../src/services/llm.service");

test("parseRepoUrl accepts the shapes people paste", () => {
  for (const input of [
    "https://github.com/vercel/next.js",
    "https://github.com/vercel/next.js/",
    "http://www.github.com/vercel/next.js.git",
    "github.com/vercel/next.js/tree/canary/packages",
    "git@github.com:vercel/next.js.git",
    "vercel/next.js",
    "  https://github.com/vercel/next.js?tab=readme  ",
  ]) {
    assert.deepEqual(parseRepoUrl(input)?.owner, "vercel", input);
    assert.deepEqual(parseRepoUrl(input)?.repo, "next.js", input);
  }
});

test("parseRepoUrl rejects junk and other hosts", () => {
  for (const input of ["", "   ", null, "https://gitlab.com/a/b", "https://github.com/onlyowner", "https://github.com/a/..", "https://github.com/-bad/repo", 42]) {
    assert.equal(parseRepoUrl(input), null, String(input));
  }
});

test("fileUtils ignores vendored, generated and lock files", () => {
  assert.equal(fileUtils.isCodeFile("src/index.ts"), true);
  assert.equal(fileUtils.isCodeFile("node_modules/react/index.js"), false);
  assert.equal(fileUtils.isCodeFile("dist/bundle.js"), false);
  assert.equal(fileUtils.isCodeFile("src/app.min.js"), false);
  assert.equal(fileUtils.isCodeFile("types/global.d.ts"), false);
  assert.equal(fileUtils.isCodeFile(".github/workflows/ci.js"), false);
  assert.equal(fileUtils.isCodeFile("CHANGELOG.md"), false);
  assert.equal(fileUtils.isCodeFile("image.png"), false);
});

test("selectFiles ranks core code above tests and caps the selection", () => {
  const tree = [
    { type: "blob", path: "src/index.js", size: 4000 },
    { type: "blob", path: "src/server/routes.js", size: 6000 },
    { type: "blob", path: "test/index.test.js", size: 9000 },
    { type: "blob", path: "README.md", size: 3000 },
    { type: "blob", path: "docs/guide.md", size: 3000 },
    { type: "blob", path: "huge.js", size: 5 * 1024 * 1024 },
    { type: "tree", path: "src" },
  ];
  const { candidates, selected, skipped } = fileUtils.selectFiles(tree, { maxFiles: 3 });
  assert.equal(candidates.length, 5, "oversized + tree entries excluded");
  assert.equal(selected.length, 3);
  const picked = selected.map((f) => f.path);
  assert.ok(picked.includes("src/index.js"));
  assert.ok(picked.includes("README.md"));
  assert.ok(skipped.map((f) => f.path).includes("test/index.test.js"));
});

test("chunker extracts whole declarations with line ranges", () => {
  const code = [
    "import x from 'y';",
    "",
    "export function alpha(a, b) {",
    "  const total = a + b;",
    "  return total * 2 + x.multiplier;",
    "}",
    "",
    "export class Beta {",
    "  method() { return 'this is a long enough method body'; }",
    "}",
    "",
    "app.use('/api/v1/really-long-route-name', handlerFunctionName);",
  ].join("\n");
  const chunks = chunkCode(code, "javascript");
  assert.ok(chunks.length >= 1);
  const all = chunks.map((c) => c.content).join("\n");
  assert.match(all, /function alpha/);
  assert.match(all, /class Beta/);
  assert.match(all, /app\.use/, "top-level code must not be dropped");
  for (const c of chunks) {
    assert.ok(c.startLine >= 1 && c.endLine >= c.startLine);
    assert.equal(c.content, code.split("\n").slice(c.startLine - 1, c.endLine).join("\n"));
  }
});

test("chunker survives non-ASCII text and files larger than 32KB", () => {
  const big = Array.from({ length: 1200 }, (_, i) => `function fn${i}() { return "ünïcødé 🚀 ${i}"; }`).join("\n");
  assert.ok(big.length > 32 * 1024);
  const chunks = chunkCode(big, "javascript");
  assert.ok(chunks.length > 5);
  assert.ok(chunks[0].content.includes("🚀"));
  assert.ok(chunks.every((c) => !c.content.includes("�")));
});

test("chunker falls back to line windows for unsupported languages", () => {
  const go = Array.from({ length: 200 }, (_, i) => `func f${i}() int { return ${i} }`).join("\n");
  const chunks = chunkCode(go, "go");
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].nodeType, "window");
  assert.deepEqual(chunkCode("", "javascript"), []);
});

test("session cookies verify only with an intact signature", () => {
  const signed = signCookie("abc123");
  assert.equal(verifyCookie(signed), "abc123");
  assert.equal(verifyCookie(signed.slice(0, -1) + (signed.endsWith("0") ? "1" : "0")), null);
  assert.equal(verifyCookie("abc123.deadbeef"), null);
  assert.equal(verifyCookie("nodot"), null);
  assert.equal(verifyCookie(undefined), null);
});

test("hybrid retrieval boosts exact identifiers", () => {
  const terms = extractTerms("Where is useAuthStore defined and how does it work?");
  assert.ok(terms.includes("__id__useauthstore"));
  const hit = { filePath: "stores/authStore.js", symbol: "useAuthStore", content: "export const useAuthStore = create()" };
  const miss = { filePath: "lib/x.js", symbol: "other", content: "nothing relevant" };
  assert.ok(lexicalScore(hit, terms) > lexicalScore(miss, terms));
  assert.ok(lexicalScore(hit, terms) <= 0.25);
});

test("chat history is normalised to alternating turns", () => {
  const out = normalizeHistory([
    { role: "assistant", content: "orphan" },
    { role: "user", content: "q1" },
    { role: "user", content: "q1b" },
    { role: "assistant", content: "a1" },
    { role: "user", content: "dangling" },
  ]);
  assert.deepEqual(out.map((m) => m.role), ["user", "assistant"]);
  assert.match(out[0].content, /q1[\s\S]*q1b/);
});

test("buildContext numbers sources and respects the budget", () => {
  const chunk = (i) => ({ filePath: `f${i}.js`, startLine: 1, endLine: 2, summary: "s", content: "x".repeat(9000), language: "js" });
  const ctx = buildContext([chunk(1), chunk(2), chunk(3), chunk(4)]);
  assert.match(ctx, /^\[1\] f1\.js/);
  assert.ok(!ctx.includes("[4]"), "over-budget sources are dropped");
});

test("diffStats and mapLimit", async () => {
  assert.deepEqual(diffStats("--- a\n+++ b\n+added\n-removed\n+again\n context"), { additions: 2, deletions: 1 });
  let active = 0;
  let peak = 0;
  const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
    peak = Math.max(peak, ++active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
    return n * 2;
  });
  assert.deepEqual(out, [2, 4, 6, 8, 10, 12]);
  assert.equal(peak, 2);
});

test("runner retries transient failures only", () => {
  assert.equal(isRetryable({ status: 429 }), true);
  assert.equal(isRetryable({ status: 503 }), true);
  assert.equal(isRetryable(new Error("socket hang up")), true);
  assert.equal(isRetryable({ status: 404 }), false);
  assert.equal(isRetryable({ retryable: false, status: 500 }), false);
});

test("token bucket enforces requests- and tokens-per-minute", () => {
  const b = new Bucket({ rpm: 2, tpm: 1000 });
  assert.equal(b.waitFor(400), 0);
  b.take(400);
  assert.equal(b.waitFor(400), 0);
  b.take(400);
  assert.ok(b.waitFor(10) > 0, "rpm exhausted");
  const t = new Bucket({ rpm: 100, tpm: 1000 });
  t.take(900);
  assert.ok(t.waitFor(200) > 0, "tpm exhausted");
  assert.equal(t.waitFor(100), 0);
  assert.ok(estimateTokens(3200) === 1000);
});

test("line windows on long-line files don't degenerate into 1-line steps", () => {
  const long = Array.from({ length: 30 }, (_, i) => `const x${i} = "${"a".repeat(700)}";`).join("\n");
  const chunks = chunkCode(long, "go");
  assert.ok(chunks.length <= 12, `expected ~10 windows, got ${chunks.length}`);
  assert.equal(chunks.at(-1).endLine, 30, "covers the whole file");
});

test("runner never exceeds its concurrency, even while claims are in flight", async () => {
  const r = new JobRunner({ concurrency: 1 });
  let active = 0;
  let peak = 0;
  r.run = async (id) => {
    peak = Math.max(peak, ++active);
    await new Promise((res) => setTimeout(res, 20));
    active--;
    r.running.delete(id);
    r.tick();
  };
  ["a", "b", "c", "d"].forEach((id) => r.enqueue(id));
  await new Promise((res) => setTimeout(res, 200));
  assert.equal(peak, 1);
  assert.equal(r.queue.length, 0);
  await r.stop(100);
});

test("GitHub rate limits fail fast instead of burning retries", () => {
  assert.equal(isRetryable({ status: 429, code: "GITHUB_RATE_LIMIT" }), false);
});
