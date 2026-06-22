// src/services/github.service.js

/**
 * This file is our Ambassador, the only person in our app authorized to speak
 * to GitHub's servers. It uses @octokit/rest (GitHub's official SDK) to
 * centralize all external communication.
 *
 * We use GitHub's Git Trees API with recursive=1 to fetch the entire repository
 * structure in a single API call instead of recursively traversing folders.
 * This dramatically improves performance for large repositories.
 */

const { Octokit } = require("@octokit/rest");
const config = require("../config");

const octokit = new Octokit({
  auth: config.githubToken,
});

/**
 * Fetches the complete repository file tree in a single API call.
 *
 * Workflow:
 * 1. Resolve HEAD to find the latest commit.
 * 2. Extract the tree SHA from that commit.
 * 3. Request the full tree recursively.
 *
 * Returns:
 * An array of file/folder objects containing metadata such as:
 * - path
 * - type ("blob" = file, "tree" = folder)
 * - size
 */
async function fetchRepoTree(owner, repo) {
  const { data: commit } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: "HEAD",
  });

  const treeSha = commit.commit.tree.sha;

  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "1",
  });

  return tree.tree;
}

/**
 * Downloads the content of a specific file from GitHub.
 *
 * Normally, requesting format:"raw" should return plain text directly.
 * However, GitHub occasionally ignores the raw media type and instead
 * returns a JSON object containing base64-encoded file contents.
 *
 * This function defensively handles both scenarios:
 *
 * 1. Raw text response → return it directly.
 * 2. Base64 JSON response → decode and return UTF-8 text.
 *
 * It also guarantees that the return value is always a string,
 * preventing downstream parsers (e.g. Tree-sitter) from crashing
 * when unexpected objects are returned.
 *
 * If the file cannot be fetched, we return an empty string instead
 * of crashing the entire repository analysis process.
 */
async function getRawFile(owner, repo, path) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      mediaType: {
        format: "raw",
      },
    });

    // GitHub sometimes ignores the raw header and returns
    // the standard JSON response containing base64 content.
    if (
      typeof data === "object" &&
      data.type === "file" &&
      data.encoding === "base64"
    ) {
      return Buffer.from(data.content, "base64").toString("utf8");
    }

    // Ensure downstream consumers always receive a string.
    return typeof data === "string" ? data : JSON.stringify(data);
  } catch (error) {
    // A single missing or inaccessible file should not break
    // analysis of the entire repository.
    console.warn(
      `[GitHub] Failed to get raw file for ${path}: ${error.message}`,
    );

    return "";
  }
}

/**
 * Fetches metadata for the most recent commits.
 *
 * Returns commit information such as:
 * - SHA
 * - author
 * - commit message
 * - timestamp
 */
async function getCommits(owner, repo, count = 10) {
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    per_page: count,
  });

  return data;
}

/**
 * Fetches the unified diff for a specific commit.
 *
 * The diff contains the exact lines that were:
 * - added (+)
 * - removed (-)
 *
 * Useful for change analysis, commit summaries,
 * and AI-powered code review features.
 */
async function getCommitDiff(owner, repo, sha) {
  const { data } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha,
    mediaType: {
      format: "diff",
    },
  });

  return data;
}

module.exports = {
  fetchRepoTree,
  getRawFile,
  getCommits,
  getCommitDiff,
};
