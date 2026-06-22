// src/lib/fileUtils.js can be thought of as the Bouncer at the door, deciding ho gets in based on strict rules. When a user submits a repository, the repo may contain massive datasets (.csv), images (.png) or compiled binaries (.exe). If we send this to the AI, it will cost money, and waste time and resources. So this file acts as a filter, ensuring we only process manageable, human readable code files.

const path = require("path");

const ALLOWED_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".cs",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".kt",
  ".swift",
  ".html",
  ".md",
]);

const EXTENSION_TO_LANGUAGE = {
  ".js": "javascript",
  ".jsx": "javascript",

  ".ts": "typescript",
  ".tsx": "tsx",

  ".py": "python",

  ".java": "java",

  ".cpp": "cpp",

  ".c": "c",
  ".cs": "csharp",

  ".go": "go",

  ".rs": "rust",

  ".rb": "ruby",

  ".php": "php",

  ".kt": "kotlin",

  ".swift": "swift",

  ".html": "html",

  ".md": "markdown",
};

const MAX_FILE_SIZE_BYTES = 1048576; // 1 MB

/**
 * Checks if the file path ends with a supported programming language extension.
 * @param {string} filePath - e.g., "src/controllers/auth.js"
 */

function isCodeFile(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Checks if a file exceeds the 1MB safety limit
 */

function exceedsSize(sizeInBytes) {
  return sizeInBytes > MAX_FILE_SIZE_BYTES;
}

/**
 * Return the Tree-Sitter language identifier for chunking
 */

function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || "unknown";
}

module.exports = {
  isCodeFile,
  exceedsSize,
  getLanguage,
};
