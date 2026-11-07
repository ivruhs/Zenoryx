// Parses the many shapes people paste for a GitHub repo into { owner, repo }.
//   https://github.com/vercel/next.js
//   github.com/vercel/next.js/tree/canary/packages
//   git@github.com:vercel/next.js.git
//   vercel/next.js
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

function parseRepoUrl(input) {
  if (typeof input !== "string") return null;
  let s = input.trim();
  if (!s) return null;

  s = s.replace(/^git@github\.com:/i, "");
  s = s.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "");
  if (/^[a-z]+:\/\//i.test(s)) return null; // some other host

  const [owner, rawRepo] = s.split(/[/?#]/).filter(Boolean);
  if (!owner || !rawRepo) return null;
  const repo = rawRepo.replace(/\.git$/i, "");

  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || repo === "." || repo === "..") return null;
  return { owner, repo, canonicalUrl: `https://github.com/${owner}/${repo}` };
}

module.exports = { parseRepoUrl };
