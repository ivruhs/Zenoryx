// Retrieval-augmented Q&A streamed over Server-Sent Events.
//
// Event protocol (one JSON object per `data:` line):
//   {type:"sources", sources:[{n, filePath, startLine, endLine, symbol, summary, snippet, score}]}
//   {type:"token", token}
//   {type:"done", messageId, latencyMs, provider, model}
//   {type:"error", error}
const prisma = require("../prisma/client");
const logger = require("../lib/logger");
const llm = require("../services/llm.service");
const embeddings = require("../services/embedding.service");
const vector = require("../services/vector.service");

const MAX_QUESTION = 2000;
// Context is sized per model route: large for Gemini, trimmed for Groq's 8K TPM.
const HISTORY_TURNS = 6;

const SYSTEM_PROMPT = `You are Zenoryx, a principal engineer who has read every line of this repository.
Answer questions about the codebase using ONLY the numbered sources provided.

Rules:
- Lead with a direct answer in 1–2 sentences, then the supporting detail.
- Cite sources inline with their number in square brackets, e.g. "Sessions are HMAC-signed [2]." Cite every non-trivial claim. Never cite a number that was not provided.
- Use exact file names, function names, constants and string literals from the code. Wrap identifiers in backticks.
- Use short "###" headings, bullets, and fenced code blocks (with a language tag) when they aid clarity. Quote only the relevant lines.
- If the sources don't contain the answer, say so plainly and state what is missing — do not guess.
- Be concise: under 250 words unless the user asks for depth.`;

function buildContext(chunks, budget = 22_000, fileRoles = new Map()) {
  let used = 0;
  const parts = [];
  for (const [i, c] of chunks.entries()) {
    const header = `[${i + 1}] ${c.filePath}${c.startLine ? ` (lines ${c.startLine}-${c.endLine})` : ""}${c.symbol ? ` — ${c.symbol}` : ""}`;
    const role = fileRoles.get(c.filePath);
    const remaining = budget - used - header.length - 80;
    if (remaining < 400 && parts.length > 0) break;
    const code = c.content.length > remaining ? `${c.content.slice(0, Math.max(400, remaining))}\n…` : c.content;
    const block = `${header}${role ? `\nFile role: ${role}` : ""}\n\`\`\`${c.language || ""}\n${code}\n\`\`\``;
    parts.push(block);
    used += block.length;
  }
  return parts.join("\n\n");
}

/** True for the deterministic "X in file, lines a–b." descriptions (not worth showing). */
const isStructural = (s) => typeof s === "string" && /, lines \d+–\d+\.$/.test(s);

/** Chat APIs require alternating user/assistant turns that start with "user". */
function normalizeHistory(history) {
  const out = [];
  for (const m of history) {
    const content = m.content.slice(0, 4000);
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${content}`;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  if (out.length && out[out.length - 1].role === "user") out.pop();
  return out;
}

async function ask(req, res) {
  const { projectId } = req.body || {};
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!projectId || !question) {
    return res.status(400).json({ error: "projectId and question are required." });
  }
  if (question.length > MAX_QUESTION) {
    return res.status(400).json({ error: `Questions are limited to ${MAX_QUESTION} characters.` });
  }

  const project = await prisma.project.findFirst({
    where: { id: String(projectId), userId: req.user.id },
    select: { id: true, status: true, name: true, fileIndex: true },
  });
  if (!project) return res.status(404).json({ error: "Project not found." });
  if (project.status !== "READY") return res.status(409).json({ error: "This repository is still being indexed." });

  // ---- open the stream --------------------------------------------------
  const started = Date.now();
  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const controller = new AbortController();
  // NB: listen on the *response*. `req` emits "close" as soon as the POST body is
  // consumed, which previously ended streams before the first token.
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });
  const send = (event) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  const heartbeat = setInterval(() => !res.writableEnded && res.write(": ping\n\n"), 15_000);

  try {
    const history = await prisma.chatMessage.findMany({
      where: { projectId: project.id, userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_TURNS,
      select: { role: true, content: true },
    });
    history.reverse();

    // Follow-ups like "and where is it called?" need the previous question to retrieve well.
    const lastUserQ = [...history].reverse().find((m) => m.role === "user")?.content;
    const retrievalQuery = lastUserQ && question.split(/\s+/).length < 12 ? `${lastUserQ}\n${question}` : question;

    const qVector = await embeddings.embedQuery(retrievalQuery, { signal: controller.signal });
    const chunks = await vector.search(project.id, qVector, retrievalQuery);
    if (chunks.length === 0) {
      send({ type: "error", error: "No indexed code was found for this repository." });
      return;
    }

    const fileRoles = new Map(
      (Array.isArray(project.fileIndex) ? project.fileIndex : []).map((f) => [f.path, f.summary]).filter(([, s]) => s),
    );
    const sources = chunks.map((c, i) => ({
      n: i + 1,
      filePath: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
      symbol: c.symbol,
      language: c.language,
      // Prefer the file's AI-written role; fall back to the chunk's own summary (legacy rows).
      summary: fileRoles.get(c.filePath) || (isStructural(c.summary) ? null : c.summary),
      snippet: c.content.length > 1200 ? `${c.content.slice(0, 1200)}\n…` : c.content,
      score: Math.round(c.score * 1000) / 1000,
    }));
    send({ type: "sources", sources });

    const priorTurns = normalizeHistory(history);
    // Called once per model route with that route's prompt budget.
    const build = (maxChars) => {
      const historyBudget = Math.floor(maxChars * 0.2);
      let turns = priorTurns;
      while (turns.length && turns.reduce((n, m) => n + m.content.length, 0) > historyBudget) turns = turns.slice(2);
      const contextBudget = maxChars - turns.reduce((n, m) => n + m.content.length, 0) - question.length - 600;
      return [
        ...turns,
        {
          role: "user",
          content: `Repository: ${project.name}\n\n=== SOURCES ===\n${buildContext(chunks, contextBudget, fileRoles)}\n=== END SOURCES ===\n\nQuestion: ${question}`,
        },
      ];
    };

    let answer = "";
    const { provider, model } = await llm.stream(
      { system: SYSTEM_PROMPT, build, maxTokens: 1400, temperature: 0.2, signal: controller.signal },
      (token) => {
        answer += token;
        send({ type: "token", token });
      },
      { purpose: "interactive", maxWaitMs: 20_000 },
    );

    const latencyMs = Date.now() - started;
    // Persist the exchange only once it fully succeeded, keeping history well-formed.
    const asked = new Date(started);
    const [, saved] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: { role: "user", content: question, projectId: project.id, userId: req.user.id, createdAt: asked },
      }),
      prisma.chatMessage.create({
        data: {
          role: "assistant",
          content: answer || "_No answer was generated._",
          sources: sources.map(({ snippet, ...s }) => ({ ...s, snippet: snippet.slice(0, 600) })),
          latencyMs,
          projectId: project.id,
          userId: req.user.id,
        },
      }),
    ]);
    send({ type: "done", messageId: saved.id, latencyMs, provider, model });
  } catch (err) {
    if (controller.signal.aborted) {
      logger.debug("[qa] client disconnected; generation aborted");
    } else {
      logger.error({ err: err.message }, "[qa] generation failed");
      const busy = err.status === 429 || /429|quota|rate/i.test(err.message || "");
      send({
        type: "error",
        error: busy
          ? "The free AI tier is busy right now. Please try again in a minute."
          : "Something went wrong while generating the answer.",
      });
    }
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}

module.exports = { ask, SYSTEM_PROMPT, buildContext, normalizeHistory };
