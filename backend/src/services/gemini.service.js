// src/services/gemini.service.js

/**
 * ******************* NOTEE*******************
 * Even though file name is gemini.service.js,
 * due to rate limiting issues with Gemini, we are using Groq for code summarization. The code for that remains in this file because other files have already imported this service.
 * *********************************************
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const pRetry = require("p-retry");
const config = require("../config");
const logger = require("../lib/logger");

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const groq = new Groq({
  apiKey: config.groqApiKey,
});

// Only embeddings remain on Gemini
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

// simple sleep utilisty to
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates a 3-bullet plain-English summary of a raw code chunk.
 */

async function generateSummary(codeContent) {
  return pRetry(
    async () => {
      const prompt = `
Analyze the following source code and return EXACTLY 3 bullet points.

Requirements:
- Bullet 1: What this code does
- Bullet 2: Main inputs/dependencies
- Bullet 3: Outputs/side effects

Keep each bullet under 20 words.
Do not explain.
Do not add headings.

Code:
${codeContent.substring(0, 12000)}
`;

      const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      return (
        response.choices?.[0]?.message?.content || "Failed to generate summary."
      );
    },
    {
      retries: 3,
      onFailedAttempt: (error) => {
        logger.warn(
          `Groq summary attempt ${error.attemptNumber} failed: ${error.message}`,
        );
      },
    },
  );
}

/**
 * Generates a 3072-dimensional vector embedding for similarity search.
 */

async function generateEmbedding(text) {
  return pRetry(
    async () => {
      await sleep(config.geminiDelayMs);

      // Truncate to ~8000 chars to avoid blowing up the token context limits
      const result = await embeddingModel.embedContent(text.substring(0, 8000));
      return result.embedding.values; // Array of 3072 floats
    },
    {
      retries: 3,
      onFailedAttempt: (error) => {
        logger.warn(
          `Gemini embedding attempt ${error.attemptNumber} failed: ${error.message}`,
        );
      },
    },
  );
}

module.exports = {
  generateSummary,
  generateEmbedding,
};
