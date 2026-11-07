// Language display metadata. Colours are tuned for the ink palette.
const LANGS = {
  javascript: { label: "JavaScript", color: "#ffd84a", ext: "js" },
  typescript: { label: "TypeScript", color: "#4f7fe0", ext: "ts" },
  tsx: { label: "TSX", color: "#7fb6ff", ext: "tsx" },
  python: { label: "Python", color: "#3fa0a8", ext: "py" },
  java: { label: "Java", color: "#e8925a", ext: "java" },
  cpp: { label: "C++", color: "#f06b9a", ext: "cpp" },
  c: { label: "C", color: "#a8b9cc", ext: "c" },
  csharp: { label: "C#", color: "#9b6cf0", ext: "cs" },
  go: { label: "Go", color: "#5ad2e8", ext: "go" },
  rust: { label: "Rust", color: "#e8a07a", ext: "rs" },
  ruby: { label: "Ruby", color: "#f05a5a", ext: "rb" },
  php: { label: "PHP", color: "#8f93d6", ext: "php" },
  kotlin: { label: "Kotlin", color: "#b98cff", ext: "kt" },
  swift: { label: "Swift", color: "#ff8a4c", ext: "swift" },
  scala: { label: "Scala", color: "#e8524a", ext: "scala" },
  vue: { label: "Vue", color: "#4fd1a1", ext: "vue" },
  svelte: { label: "Svelte", color: "#ff6a3d", ext: "svelte" },
  html: { label: "HTML", color: "#ef7550", ext: "html" },
  css: { label: "CSS", color: "#7f8cff", ext: "css" },
  sql: { label: "SQL", color: "#e3c67a", ext: "sql" },
  shell: { label: "Shell", color: "#8fdc6a", ext: "sh" },
  markdown: { label: "Markdown", color: "#c9bfae", ext: "md" },
};

export function langMeta(language) {
  return LANGS[language] || { label: language || "Other", color: "#b8ad9a", ext: "" };
}

/** Prism grammar name for react-syntax-highlighter. */
export function prismLanguage(language) {
  const map = { tsx: "tsx", typescript: "typescript", javascript: "jsx", python: "python", java: "java", cpp: "cpp", c: "c", csharp: "csharp", go: "go", rust: "rust", ruby: "ruby", php: "php", kotlin: "kotlin", swift: "swift", html: "markup", css: "css", sql: "sql", shell: "bash", markdown: "markdown", json: "json", bash: "bash", sh: "bash", js: "jsx", ts: "typescript", py: "python" };
  return map[language] || "text";
}
