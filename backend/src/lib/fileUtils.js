// Decides which files in a repository are worth indexing, and in what order.
// Large repos are no longer rejected: we rank every supported file and index the
// top N, so the most architecturally relevant code is always covered.
const path = require("path");

const EXTENSION_TO_LANGUAGE = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "tsx",
  ".py": "python",
  ".java": "java",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".h": "cpp",
  ".c": "c",
  ".cs": "csharp",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".php": "php",
  ".kt": "kotlin",
  ".swift": "swift",
  ".scala": "scala",
  ".vue": "vue",
  ".svelte": "svelte",
  ".html": "html",
  ".css": "css",
  ".scss": "css",
  ".sql": "sql",
  ".sh": "shell",
  ".md": "markdown",
};

const IGNORED_DIRS = new Set([
  "node_modules", "vendor", "dist", "build", "out", ".next", ".nuxt", "coverage",
  "target", "bin", "obj", "__pycache__", ".venv", "venv", "env", ".git", ".github",
  ".idea", ".vscode", "third_party", "external", "deps", "public", "static", "assets",
  "fixtures", "__snapshots__", "migrations", "generated", "Pods", "DerivedData",
]);

const IGNORED_FILE_RE = [
  /\.min\.(js|css)$/i,
  /\.bundle\.js$/i,
  /\.d\.ts$/i,
  /(^|\/)package-lock\.json$/i,
  /(^|\/)yarn\.lock$/i,
  /(^|\/)pnpm-lock\.yaml$/i,
  /\.(map|snap)$/i,
  /(^|\/)(CHANGELOG|HISTORY|CHANGES|LICENSE|CODE_OF_CONDUCT|CONTRIBUTING|SECURITY|AUTHORS)(\.md)?$/i,
];

const MAX_FILE_SIZE_BYTES = 200 * 1024;

function getLanguage(filePath) {
  return EXTENSION_TO_LANGUAGE[path.extname(filePath || "").toLowerCase()] || "unknown";
}

function isIgnoredPath(filePath) {
  const parts = filePath.split("/");
  if (parts.slice(0, -1).some((p) => IGNORED_DIRS.has(p) || (p.startsWith(".") && p.length > 1))) return true;
  return IGNORED_FILE_RE.some((re) => re.test(filePath));
}

function isCodeFile(filePath) {
  if (!filePath) return false;
  return getLanguage(filePath) !== "unknown" && !isIgnoredPath(filePath);
}

function exceedsSize(sizeInBytes, limit = MAX_FILE_SIZE_BYTES) {
  return typeof sizeInBytes === "number" && sizeInBytes > limit;
}

const ENTRY_NAMES = /^(index|main|app|server|cli|lib|mod|__init__|program|application|router|routes|api)\./i;
const CORE_DIRS = /(^|\/)(src|lib|app|core|server|api|pkg|internal|cmd|services|controllers|routes|components|hooks|models|handlers|utils)\//i;
const TEST_RE = /(^|\/)(tests?|test-d|__tests__|__mocks__|spec|specs|e2e|examples?|samples?|demos?|docs?|benchmarks?|bench|scripts|playground|fixtures)\/|\.(test|spec|stories|bench)\.[a-z]+$|_test\.(go|py)$|(^|\/)test_[^/]+\.py$/i;
const CONFIG_RE = /(^|\/)[^/]*\.(config|conf|rc)\.[a-z]+$/i;

/** Higher = more likely to explain how the system works. */
function scoreFile(file) {
  const p = file.path;
  const lang = getLanguage(p);
  let score = 0;
  const depth = p.split("/").length - 1;
  score -= depth * 1.5;
  if (ENTRY_NAMES.test(path.basename(p))) score += 8;
  if (CORE_DIRS.test(p)) score += 6;
  if (TEST_RE.test(p)) score -= 12;
  if (CONFIG_RE.test(p)) score -= 6;
  if (lang === "markdown") score += /^readme\.md$/i.test(p) ? 10 : -8;
  if (["css", "html", "shell", "sql"].includes(lang)) score -= 5;
  // Prefer substantive but not gigantic files.
  const kb = (file.size || 0) / 1024;
  if (kb < 0.3) score -= 6;
  else if (kb <= 40) score += Math.min(kb, 20) / 4;
  else score -= 2;
  return score;
}

/**
 * Filters a git tree down to indexable code and ranks it.
 * @returns {{ candidates: object[], selected: object[], skipped: object[] }}
 */
function selectFiles(tree, { maxFiles = 40, maxFileBytes = MAX_FILE_SIZE_BYTES } = {}) {
  const candidates = tree
    .filter((f) => f.type === "blob" && f.size !== 0 && isCodeFile(f.path) && !exceedsSize(f.size, maxFileBytes))
    .map((f) => ({ path: f.path, size: f.size || 0, language: getLanguage(f.path), score: scoreFile(f) }));

  const ranked = [...candidates].sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const selectedSet = new Set(ranked.slice(0, maxFiles).map((f) => f.path));
  const byPath = (a, b) => a.path.localeCompare(b.path);
  return {
    candidates: candidates.sort(byPath),
    selected: candidates.filter((f) => selectedSet.has(f.path)).sort(byPath),
    skipped: candidates.filter((f) => !selectedSet.has(f.path)).sort(byPath),
  };
}

function languageBreakdown(files) {
  const totals = {};
  for (const f of files) totals[f.language] = (totals[f.language] || 0) + (f.size || 1);
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(totals)
    .map(([language, bytes]) => ({ language, bytes, share: bytes / sum }))
    .sort((a, b) => b.bytes - a.bytes);
}

module.exports = {
  isCodeFile,
  isIgnoredPath,
  exceedsSize,
  getLanguage,
  scoreFile,
  selectFiles,
  languageBreakdown,
  MAX_FILE_SIZE_BYTES,
};
