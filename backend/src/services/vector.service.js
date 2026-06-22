// src/services/vector.service.js

/**
 * We will use cosine distance operator to find the chunks that are mathematically closest to the user's question. We will configure this search to return top 30 chunks. This gives our controller plenty of data to deduplicate.
 */

const prisma = require("../prisma/client");
const logger = require("../lib/logger");

/**
 * Searches the vector db for the most releant code chunks to the user's question.
 * We fetch the top 30 most relevant chunks to ensure we can extract 7 unique files.
 */

async function similaritySearch(projectId, embeddingArray, topK = 30) {
  try {
    const vectorStr = `[${embeddingArray.join(",")}]`;
    const chunks = await prisma.$queryRaw`
    SELECT id, "filePath", "summary", "content", "chunkIndex"
      FROM "code_chunks"
      WHERE "projectId" = ${projectId}
      ORDER BY "embedding" <=> ${vectorStr}::vector
      LIMIT ${topK}
    `;
    return chunks;
  } catch (error) {
    logger.error(error, "Vector similarity search failed");
    throw new Error("Failed to search code context.");
  }
}

module.exports = {
  similaritySearch,
};
