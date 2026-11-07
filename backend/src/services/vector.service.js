// Hybrid retrieval: pgvector cosine search + lexical identifier boosting + per-file diversity.
const prisma = require("../prisma/client");

const STOP = new Set(
  "the and for with that this from what where when which how does into about there their have has are was were will would could should your you can why who use used using code file files function functions method class work works project repo repository".split(
    " ",
  ),
);

const TEST_PATH = /(^|\/)(tests?|__tests__|spec|e2e)\/|\.(test|spec)\.[a-z]+$/i;

/** Identifiers & meaningful words from the question (camelCase, snake_case, paths). */
function extractTerms(question) {
  const raw = question.match(/[A-Za-z_$][\w$.-]{2,}/g) || [];
  const terms = new Set();
  for (const t of raw) {
    const clean = t.replace(/[.-]+$/, "");
    if (clean.length < 3 || STOP.has(clean.toLowerCase())) continue;
    terms.add(clean.toLowerCase());
    const looksLikeIdentifier = /[a-z][A-Z]|_|\./.test(clean);
    if (looksLikeIdentifier) terms.add(`__id__${clean.toLowerCase()}`);
  }
  return [...terms];
}

function lexicalScore(chunk, terms) {
  if (!terms.length) return 0;
  const hay = `${chunk.filePath}\n${chunk.symbol || ""}\n${chunk.content}`.toLowerCase();
  let score = 0;
  for (const t of terms) {
    if (t.startsWith("__id__")) {
      const id = t.slice(6);
      if ((chunk.symbol || "").toLowerCase().includes(id)) score += 0.12;
      else if (hay.includes(id)) score += 0.06;
    } else if (chunk.filePath.toLowerCase().includes(t)) score += 0.05;
    else if (hay.includes(t)) score += 0.015;
  }
  return Math.min(score, 0.25);
}

/**
 * @returns {Promise<Array<{id,filePath,summary,content,chunkIndex,symbol,nodeType,startLine,endLine,language,similarity,score}>>}
 */
async function search(projectId, queryVector, question, { candidates = 30, limit = 8, perFile = 3 } = {}) {
  const vectorStr = `[${queryVector.join(",")}]`;
  const rows = await prisma.$queryRaw`
    SELECT id, "filePath", summary, content, "chunkIndex", symbol, "nodeType", "startLine", "endLine", language,
           1 - ("embedding" <=> ${vectorStr}::vector) AS similarity
    FROM "code_chunks"
    WHERE "projectId" = ${projectId}
    ORDER BY "embedding" <=> ${vectorStr}::vector
    LIMIT ${candidates}`;

  const terms = extractTerms(question);
  // Unless the user asks about tests/docs, prefer implementation code over them.
  const wantsTests = /\b(test|tests|spec|testing|coverage)\b/i.test(question);
  const wantsDocs = /\b(readme|docs?|documentation|install|setup|usage)\b/i.test(question);
  const penalty = (r) =>
    (!wantsTests && TEST_PATH.test(r.filePath) ? 0.06 : 0) + (!wantsDocs && r.language === "markdown" ? 0.02 : 0);
  const scored = rows
    .map((r) => ({
      ...r,
      similarity: Number(r.similarity),
      score: Number(r.similarity) + lexicalScore(r, terms) - penalty(r),
    }))
    .sort((a, b) => b.score - a.score);

  const perFileCount = new Map();
  const picked = [];
  for (const r of scored) {
    const n = perFileCount.get(r.filePath) || 0;
    if (n >= perFile) continue;
    perFileCount.set(r.filePath, n + 1);
    picked.push(r);
    if (picked.length >= limit) break;
  }
  return picked;
}

module.exports = { search, extractTerms, lexicalScore };
