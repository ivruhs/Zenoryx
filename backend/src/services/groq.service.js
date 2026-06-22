// src/services/groq.service.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const config = require("../config");
const logger = require("../lib/logger");

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const qnaModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

const groq = new Groq({ apiKey: config.groqApiKey });

/**
 * Streams the RAG answer directly back to the client using Server-Sent Events (SSE).
 */
async function streamQnA(systemPrompt, userQuestion, res) {
  try {
    const result = await qnaModel.generateContentStream({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
SYSTEM INSTRUCTIONS:
${systemPrompt}

USER QUESTION:
${userQuestion}
          `,
            },
          ],
        },
      ],
    });

    for await (const chunk of result.stream) {
      const token = chunk.text();

      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    logger.error(error, "Gemini streaming failed");

    res.write(
      `data: ${JSON.stringify({
        error: "Failed to generate response",
      })}\n\n`,
    );

    res.end();
  }
}

/**
 * Non-streaming function to summarize Git diffs into 2-3 plain English sentences.
 */
async function summarizeDiff(diffText) {
  try {
    const prompt = `Summarize the following Git diff in 2-3 sentences. Focus on functional changes, write in past tense, and avoid mentioning file names or line numbers.\n\nDiff:\n${diffText.substring(0, 8000)}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content || "No summary generated.";
  } catch (error) {
    logger.warn(error, "Groq diff summarization failed");
    return "Failed to generate commit summary.";
  }
}

module.exports = {
  streamQnA,
  summarizeDiff,
};
