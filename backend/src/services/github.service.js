// The only module that talks to GitHub.
//
// Free-tier strategy:
//  * A personal access token is optional. If it is missing — or expired/revoked —
//    we transparently fall back to anonymous access (60 req/h) instead of failing.
//  * File contents are downloaded from raw.githubusercontent.com, which does NOT
//    count against the REST API rate limit. A full ingestion costs ~3 + N_commits
//    API calls regardless of how many files are indexed.
const { Octokit } = require("@octokit/rest");
const config = require("../config");
const logger = require("../lib/logger");

const silentLog = { debug() {}, info() {}, warn() {}, error() {} };
const anonymous = new Octokit({ log: silentLog, userAgent: "zenoryx" });
let authed = config.githubToken
  ? new Octokit({ auth: config.githubToken, log: silentLog, userAgent: "zenoryx" })
  : null;

class GitHubError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true;
  }
}

function translate(err, owner, repo) {
  if (err instanceof GitHubError) return err;
  const status = err.status;
  if (status === 404) return new GitHubError(`Repository ${owner}/${repo} was not found or is private.`, 404, "REPO_NOT_FOUND");
  if (status === 409) return new GitHubError(`Repository ${owner}/${repo} is empty.`, 400, "REPO_EMPTY");
  if (status === 403 || status === 429) {
    const reset = Number(err.response?.headers?.["x-ratelimit-reset"]);
    const mins = reset ? Math.max(1, Math.ceil((reset * 1000 - Date.now()) / 60000)) : null;
    return new GitHubError(
      `GitHub API rate limit reached${mins ? ` — try again in ~${mins} min` : ""}. Add a free GITHUB_TOKEN to raise the limit.`,
      429,
      "GITHUB_RATE_LIMIT",
    );
  }
  return new GitHubError(`GitHub request failed: ${err.message}`, 502, "GITHUB_ERROR");
}

/** Runs a request with the token, falling back to anonymous on bad credentials. */
async function call(fn, owner, repo) {
  if (authed) {
    try {
      return await fn(authed);
    } catch (err) {
      if (err.status === 401) {
        logger.warn("[github] GITHUB_TOKEN rejected (expired or revoked) — continuing anonymously");
        authed = null;
      } else {
        throw translate(err, owner, repo);
      }
    }
  }
  try {
    return await fn(anonymous);
  } catch (err) {
    throw translate(err, owner, repo);
  }
}

// Validation followed by ingestion asks for the same metadata + tree within
// seconds; a short TTL cache halves API usage under the anonymous limit.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const promise = fn().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { promise, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return promise;
}

function getRepoMeta(owner, repo) {
  return cached(`meta:${owner}/${repo}`.toLowerCase(), () => fetchRepoMeta(owner, repo));
}

function getTree(owner, repo, branch) {
  return cached(`tree:${owner}/${repo}@${branch}`.toLowerCase(), () => fetchTree(owner, repo, branch));
}

async function fetchRepoMeta(owner, repo) {
  const { data } = await call((o) => o.rest.repos.get({ owner, repo }), owner, repo);
  if (data.private) throw new GitHubError("Private repositories are not supported.", 400, "REPO_PRIVATE");
  return {
    owner: data.owner.login,
    repo: data.name,
    description: data.description,
    stars: data.stargazers_count,
    primaryLanguage: data.language,
    defaultBranch: data.default_branch,
    sizeKb: data.size,
  };
}

/** Full recursive tree for a branch in one call. Returns the resolved commit sha too. */
async function fetchTree(owner, repo, branch) {
  const { data: branchData } = await call((o) => o.rest.repos.getBranch({ owner, repo, branch }), owner, repo);
  const commitSha = branchData.commit.sha;
  const treeSha = branchData.commit.commit.tree.sha;
  const { data } = await call(
    (o) => o.rest.git.getTree({ owner, repo, tree_sha: treeSha, recursive: "1" }),
    owner,
    repo,
  );
  if (data.truncated) logger.warn({ owner, repo }, "[github] tree truncated by GitHub (very large repo)");
  return { commitSha, tree: data.tree, truncated: Boolean(data.truncated) };
}

/**
 * Downloads a file via the raw CDN (no API quota).
 * Returns the text, "" for a file that genuinely doesn't exist (404), or null when
 * the download failed (throttling, 5xx, timeout) so callers can tell the difference.
 */
async function getRawFile(owner, repo, ref, filePath, { timeoutMs = 15000 } = {}) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const headers = authed && config.githubToken ? { authorization: `token ${config.githubToken}` } : undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return await res.text();
      if (res.status === 404) return "";
      if (res.status < 500 && res.status !== 429) return null;
    } catch (err) {
      if (attempt === 3) logger.warn({ filePath, err: err.message }, "[github] raw download failed");
    }
    await new Promise((r) => setTimeout(r, 600 * attempt));
  }
  return null;
}

async function getCommits(owner, repo, count = 6) {
  const { data } = await call((o) => o.rest.repos.listCommits({ owner, repo, per_page: count }), owner, repo);
  return data;
}

/** Unified diff + stats for one commit. */
async function getCommitDiff(owner, repo, sha) {
  const { data } = await call(
    (o) => o.rest.repos.getCommit({ owner, repo, ref: sha, mediaType: { format: "diff" } }),
    owner,
    repo,
  );
  return typeof data === "string" ? data : "";
}

module.exports = { getRepoMeta, getTree, getRawFile, getCommits, getCommitDiff, GitHubError };
