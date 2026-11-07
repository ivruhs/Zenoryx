// Shared description of the ingestion pipeline (mirrors backend stages).
export const STAGES = [
  { id: "fetching", label: "Fetch", verb: "Fetching the repo & ranking files", hint: "GitHub tree · raw CDN", note: "picking the good bits" },
  { id: "parsing", label: "Cut", verb: "Cutting files at the seams", hint: "Tree-sitter AST", note: "snip snip!" },
  { id: "summarizing", label: "Annotate", verb: "Annotating what each file does", hint: "free model pool", note: "margin notes" },
  { id: "embedding", label: "Embed", verb: "Turning chunks into 3072-d vectors", hint: "batched · pgvector", note: "the slow part" },
  { id: "commits", label: "History", verb: "Reading the recent commits", hint: "diff → plain English", note: "almost there" },
];

export function stageIndex(stage) {
  if (stage === "done") return STAGES.length;
  const i = STAGES.findIndex((s) => s.id === stage);
  return i === -1 ? -1 : i;
}

export const isActive = (status) => status === "PENDING" || status === "PROCESSING";

// Share of total wall-clock time each stage typically takes (embedding dominates
// because the free Gemini tier is paced to ~30K tokens/min).
const WEIGHTS = { fetching: 5, parsing: 12, summarizing: 23, embedding: 50, commits: 10 };
const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

/**
 * Overall completion 0–100 for a project, weighted by stage duration.
 * Stages without item counts (fetching, commits) count as one-third done while active.
 */
export function overallProgress(project) {
  if (!project) return 0;
  if (project.status === "READY") return 100;
  if (project.status === "PENDING") return 0;
  const stage = project.progress?.stage || project.stage;
  const idx = stageIndex(stage);
  if (idx < 0) return 0;
  if (idx >= STAGES.length) return 100;
  let pct = 0;
  for (let i = 0; i < idx; i++) pct += WEIGHTS[STAGES[i].id];
  const { done = 0, total = 0 } = project.progress || {};
  const frac = total > 0 ? Math.min(1, done / total) : 1 / 3;
  pct += WEIGHTS[stage] * frac;
  // Never show 100% until the server actually says READY.
  return Math.min(99, Math.round((pct / TOTAL_WEIGHT) * 100));
}
