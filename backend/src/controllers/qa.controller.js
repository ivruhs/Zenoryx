// src/controllers/qa.controller.js

/**
 * This controller is the brain of the QnA operaton. It evrifies the user actually owns the project (authorization). it asks gemini to convert the question into a 3072-dimensional vector. It then searches the database using the vector service.
 *
 * Custom logic: it loops through the results, uses a javaScript Set to extract exactly 7 unique file paths, formats them into a special Server-Sent Event (SSE), and shoots them to the fronten before the text starts generating.
 * Finally, it constructs a massive context prompt and streams the Groq response back to the user.
 */

//
const prisma = require("../prisma/client");
const geminiService = require("../services/gemini.service");
const vectorService = require("../services/vector.service");
const groqService = require("../services/groq.service");
const logger = require("../lib/logger");

const handleQuestion = async (req, res, next) => {
  try {
    const { projectId, question } = req.body;

    if (!projectId || !question) {
      return res
        .status(400)
        .json({ error: "Project ID and question are required." });
    }

    // 1. Authorization: Ensure the user actually owns this project
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });

    if (!project) {
      return res
        .status(403)
        .json({ error: "Unauthorized. You do not own this project." });
    }

    if (project.status !== "READY") {
      return res
        .status(400)
        .json({ error: "Project is not fully ingested yet." });
    }

    // Prepare the HTTP response for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Handle client disconnects to save Groq API costs
    req.on("close", () => {
      logger.info("Client disconnected, aborting stream.");
      res.end();
    });

    // 2. Generate Vector for the Question
    const questionEmbedding = await geminiService.generateEmbedding(question);

    // 3. Search the Database (Fetch top 30 chunks)
    const chunks = await vectorService.similaritySearch(
      projectId,
      questionEmbedding,
      30,
    );

    if (!chunks || chunks.length === 0) {
      res.write(
        `data: ${JSON.stringify({ error: "No relevant code found in this repository." })}\n\n`,
      );
      return res.end();
    }

    // 4. Extract the Top 7 Unique Files
    const uniqueFiles = new Set();
    const topChunks = []; // We will only feed the top ~30 chunks to the LLM to save context

    for (const chunk of chunks) {
      // Collect unique file paths until we hit 7
      if (uniqueFiles.size < 7) {
        uniqueFiles.add(chunk.filePath);
      }
      // Keep top 30 chunks for the actual prompt context
      if (topChunks.length < 30) {
        topChunks.push(chunk);
      }
    }

    const topFilesArray = Array.from(uniqueFiles);

    // Stream the 7 files to the frontend IMMEDIATELY as a custom event
    res.write(
      `data: ${JSON.stringify({ type: "sources", files: topFilesArray })}\n\n`,
    );

    // 5. Construct the Prompt Context
    let contextText = "";
    topChunks.forEach((chunk) => {
      contextText += `\n--- FILE: ${chunk.filePath} ---\n`;
      contextText += `SUMMARY: ${chunk.summary}\n`;
      contextText += `CODE:\n${chunk.content}\n`;
    });

    const systemPrompt = `
You are a Senior Staff Engineer.
Answer ONLY using the provided context.

Rules:
0. If the user's question is a Yes/No question, your very first token must be 'Yes' or 'No' followed by a period.
1. Start with a direct, definitive answer to the question.
2. Use ### headings, bullet points, and numbered lists for clarity.
3. Mention exact file names, function names, variables, formulas, and constants whenever they appear in the context.
4. If the question asks about relationships or synergy, include a dedicated '### How they work together' section.
5. Do not repeat the same information in different paragraphs.
6. If the context is insufficient for a specific sub-part, say 'The provided snippets do not specify [X].' (be precise about what is missing).
7. Exact Literal Extraction: If the user asks for links, URLs, APIs, query selectors, variables, or constants, scan the provided code for literal strings (e.g., fetch('...'), axios.get('...'), document.getElementById('...'), document.querySelector('...')). Output the exact string as written in the code (including template literal syntax like \${variable}). Do not summarize or generically describe them. Only say 'not specified' if you have genuinely scanned and found zero instances.
8. Prefer concise answers. Expand with detailed explanation only when the user explicitly asks for it.
9. Maximum answer length: 300 words unless the user explicitly asks for a detailed explanation.

=== CONTEXT ===
${contextText}
`;

    // 6. Stream the Answer via Groq
    await groqService.streamQnA(systemPrompt, question, res);
  } catch (error) {
    logger.error(error, "Q&A execution failed");
    if (!res.headersSent) {
      next(error);
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "An internal error occurred during generation." })}\n\n`,
      );
      res.end();
    }
  }
};

module.exports = {
  handleQuestion,
};

/**
 * Architecture Overview:
 * 
User Question
      │
      ▼
QA Controller
      │
      ▼
Authorization Check
      │
      ▼
Gemini Embedding
      │
      ▼
3072-D Vector
      │
      ▼
Postgres + pgvector
      │
      ▼
Top 30 Chunks
      │
      ▼
7 Unique Files
      │
      ▼
Build Context Prompt
      │
      ▼
Groq 70B
      │
      ▼
SSE Streaming
      │
      ▼
Frontend
 */
