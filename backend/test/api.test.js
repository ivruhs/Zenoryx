// HTTP integration tests against a real Postgres (DATABASE_URL). Every account
// created here is deleted afterwards. The full ingest → ask flow (which spends
// free-tier GitHub/Gemini quota) only runs with E2E=1:  npm run test:e2e
process.env.LOG_LEVEL = "silent";
const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma/client");
const { createApp } = require("../src/app");
const { runner } = require("../src/jobs/runner");

const RUN_E2E = process.env.E2E === "1";
const E2E_REPO = process.env.E2E_REPO || "https://github.com/expressjs/cors";

let server;
let base;
const createdEmails = [];

/** Minimal cookie-jar client. */
function client() {
  let cookie = "";
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0].endsWith("=") ? "" : set.split(";")[0];
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* SSE or empty */
    }
    return { status: res.status, json, text, headers: res.headers };
  };
  return {
    get: (p) => call("GET", p),
    post: (p, b) => call("POST", p, b ?? {}),
    del: (p) => call("DELETE", p),
    get cookie() {
      return cookie;
    },
  };
}

async function signup(c, name = "Test User") {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@zenoryx.test`;
  createdEmails.push(email);
  const res = await c.post("/api/auth/register", { email, password: "correct-horse-1", name });
  assert.equal(res.status, 201, res.text);
  return { email, user: res.json.user };
}

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await runner.stop(2000);
  if (createdEmails.length) await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  await prisma.$disconnect();
  server.close();
});

test("health endpoint is public and does not need the DB", async () => {
  const res = await client().get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.json.status, "ok");
});

test("unknown routes and malformed JSON return clean errors", async () => {
  const c = client();
  assert.equal((await c.get("/api/nope")).status, 404);
  const bad = await c.post("/api/auth/login", "{not json");
  assert.equal(bad.status, 400);
  assert.match(bad.json.error, /JSON/);
});

test("register → me → logout lifecycle", async () => {
  const c = client();
  const { email, user } = await signup(c, "Ada Lovelace");
  assert.equal(user.email, email);
  assert.equal(user.name, "Ada Lovelace");
  assert.ok(!("password" in user), "password hash must never be returned");
  assert.match(c.cookie, /^session=/);

  const me = await c.get("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.json.user.id, user.id);

  const cookieBefore = c.cookie;
  assert.equal((await c.post("/api/auth/logout")).status, 200);
  assert.equal((await c.get("/api/auth/me")).status, 401);

  // Replaying the old cookie must not work: the session row is gone.
  const replay = await fetch(`${base}/api/auth/me`, { headers: { cookie: cookieBefore } });
  assert.equal(replay.status, 401);
  // Logging out twice is harmless.
  assert.equal((await c.post("/api/auth/logout")).status, 200);
});

test("registration validation and duplicate emails", async () => {
  const c = client();
  assert.equal((await c.post("/api/auth/register", { email: "nope", password: "longenough1", name: "Al" })).status, 400);
  assert.equal((await c.post("/api/auth/register", { email: "a@b.co", password: "short", name: "Al" })).status, 400);
  assert.equal((await c.post("/api/auth/register", { email: "a@b.co", password: "longenough1", name: "" })).status, 400);
  const { email } = await signup(c);
  const dup = await client().post("/api/auth/register", { email: email.toUpperCase(), password: "correct-horse-1", name: "Dup" });
  assert.equal(dup.status, 409);
});

test("login rejects wrong passwords and unknown users identically", async () => {
  const c = client();
  const { email } = await signup(c);
  const wrong = await client().post("/api/auth/login", { email, password: "wrong-password" });
  const unknown = await client().post("/api/auth/login", { email: `ghost-${Date.now()}@zenoryx.test`, password: "whatever123" });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.json.error, unknown.json.error);
  const ok = await client().post("/api/auth/login", { email: ` ${email.toUpperCase()} `, password: "correct-horse-1" });
  assert.equal(ok.status, 200);
});

test("tampered session cookies are rejected", async () => {
  const c = client();
  await signup(c);
  const forged = c.cookie.replace(/.$/, (ch) => (ch === "a" ? "b" : "a"));
  const res = await fetch(`${base}/api/auth/me`, { headers: { cookie: forged } });
  assert.equal(res.status, 401);
});

test("project routes require auth and enforce ownership", async () => {
  assert.equal((await client().get("/api/projects")).status, 401);

  const alice = client();
  const bob = client();
  const { user } = await signup(alice, "Alice");
  await signup(bob, "Bob");

  const project = await prisma.project.create({
    data: {
      name: "octo/private-test",
      repoUrl: "https://github.com/octo/private-test",
      repoOwner: "octo",
      repoName: "private-test",
      status: "FAILED",
      errorMessage: "fixture",
      userId: user.id,
    },
  });

  const list = await alice.get("/api/projects");
  assert.equal(list.status, 200);
  assert.equal(list.json.length, 1);
  assert.equal(list.json[0].id, project.id);
  assert.equal((await bob.get("/api/projects")).json.length, 0);

  for (const path of ["", "/status", "/commits", "/files", "/messages"]) {
    assert.equal((await bob.get(`/api/projects/${project.id}${path}`)).status, 404, `bob GET ${path}`);
    assert.equal((await alice.get(`/api/projects/${project.id}${path}`)).status, 200, `alice GET ${path}`);
  }
  assert.equal((await bob.del(`/api/projects/${project.id}`)).status, 404);
  assert.equal((await bob.post("/api/qa", { projectId: project.id, question: "hi" })).status, 404);

  // Asking a non-ready project is a clean 409, not a hung stream.
  assert.equal((await alice.post("/api/qa", { projectId: project.id, question: "hi" })).status, 409);
  assert.equal((await alice.post("/api/qa", { projectId: project.id })).status, 400);

  assert.equal((await alice.del(`/api/projects/${project.id}`)).status, 200);
  assert.equal(await prisma.project.count({ where: { id: project.id } }), 0);
});

test("repository URL validation errors are user-friendly", async () => {
  const c = client();
  await signup(c);
  const bad = await c.post("/api/projects/validate", { repoUrl: "https://gitlab.com/a/b" });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.code, "INVALID_URL");
});

test("legacy (root-mounted) routes still work for older clients", async () => {
  const c = client();
  await signup(c);
  assert.equal((await c.get("/auth/me")).status, 200);
  assert.equal((await c.get("/projects")).status, 200);
});

test("E2E: validate → ingest → explore → ask (streamed) → delete", { skip: !RUN_E2E, timeout: 6 * 60 * 1000 }, async () => {
  const c = client();
  await signup(c, "E2E");

  const v = await c.post("/api/projects/validate", { repoUrl: E2E_REPO });
  assert.equal(v.status, 200, v.text);
  assert.ok(v.json.selectedCount > 0);

  const created = await c.post("/api/projects", { repoUrl: E2E_REPO });
  assert.equal(created.status, 202, created.text);
  const id = created.json.projectId;

  // Creating the same repo twice returns the existing project.
  const again = await c.post("/api/projects", { repoUrl: E2E_REPO });
  assert.equal(again.json.projectId, id);
  assert.equal(again.json.existing, true);

  const stagesSeen = new Set();
  let status;
  for (let i = 0; i < 300; i++) {
    status = (await c.get(`/api/projects/${id}/status`)).json;
    if (status.stage) stagesSeen.add(status.stage);
    if (status.status === "READY" || status.status === "FAILED") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.equal(status.status, "READY", status.errorMessage);
  assert.ok(status.chunkCount > 0);

  const files = (await c.get(`/api/projects/${id}/files`)).json;
  assert.ok(files.length > 0);
  const chunks = (await c.get(`/api/projects/${id}/chunks?path=${encodeURIComponent(files[0].path)}`)).json.chunks;
  assert.ok(chunks.length > 0 && chunks[0].startLine >= 1);

  const sse = await c.post("/api/qa", { projectId: id, question: "What does this library do and what is its main entry point?" });
  assert.equal(sse.status, 200);
  const events = sse.text
    .split("\n\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => JSON.parse(l.slice(5)));
  const types = events.map((e) => e.type);
  assert.equal(types[0], "sources");
  assert.ok(types.includes("token"));
  assert.equal(types.at(-1), "done", JSON.stringify(events.at(-1)));
  assert.ok(events[0].sources.length > 0);

  const history = (await c.get(`/api/projects/${id}/messages`)).json;
  assert.deepEqual(history.map((m) => m.role), ["user", "assistant"]);
  assert.ok(Array.isArray(history[1].sources));

  assert.equal((await c.del(`/api/projects/${id}/messages`)).status, 200);
  assert.equal((await c.del(`/api/projects/${id}`)).status, 200);
  assert.equal(await prisma.codeChunk.count({ where: { projectId: id } }), 0);
});
