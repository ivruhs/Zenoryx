// src/services/github.service.js

/**
 * This file is our Ambassador, the only person in our app authorized to speak to Github's servers. This file uses @octokit/rest (Github's official SDK) to centralize all external communication.
 *
 * Note: usually to read a repo's structure, we have to request the root folder, then ask for each subfolder, and so on. This takes dozens of API calls. Instead, we use Github's Git Trees API with recursive=1. This magical endpoint returns the entire file structure of the repo, no matter how deep, in a SINGLE API CALL. This is a huge performance boost.
 */

const { Octokit } = require("@octokit/rest");
const config = require("../config");

const octokit = new Octokit({
  auth: config.githubToken,
});

/**
 * Fetches the entire repo structure in one single API call.
 * Returns a flat array of every file and folder.
 */

async function fetchRepoTree(owner, repo) {
  // First, we need to find out what branch "HEAD" points to (usually 'main' or 'master')
  const { data: commit } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: "HEAD",
  });

  // The 'sha' is the unique ID of the latest commit. We use it to get the tree, which contains the file structure.
  const treeSha = commit.commit.tree.sha;

  // recursive=1 tells Github to drill down into every folder automatically
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "1",
  });

  return tree.tree; // array of objects containing path, type (blob for file, tree for folder), and size
}

/**
 * Downloads the raw, plain-text content of a specific code file.
 */

async function getRawFile(owner, repo, path) {
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    mediaType: {
      // this header tells Github we want the raw file content, not base64-encoded JSON
      format: "raw",
    },
  });
  return data; // this will be the raw text content of the file
}

/**
 * Fetches the metadata (author, date, message) for the N most recent commits.
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
 * Fetches the unified diff (the exact lines added/removed) for a specific commit.
 */
async function getCommitDiff(owner, repo, sha) {
  const { data } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha,
    mediaType: {
      // This tells GitHub: "Give me the unified diff format, not the JSON metadata"
      format: "diff",
    },
  });
  return data; // Returns a raw string of the diff (e.g., "+ const x = 1;\n- const y = 2;")
}

module.exports = {
  fetchRepoTree,
  getRawFile,
  getCommits,
  getCommitDiff,
};
