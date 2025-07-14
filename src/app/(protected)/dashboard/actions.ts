"use server";
import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";
import { createGroq } from "@ai-sdk/groq";
import { generateEmbedding } from "../../../lib/together";
import { db } from "../../../server/db";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Rate limiting configuration for Groq (70k TPM)
const RATE_LIMIT = {
  maxTokensPerMinute: 30000,
  windowMs: 60 * 1000, // 1 minute
  maxRetries: 5,
  baseDelay: 1000,
};

// Simple in-memory rate limiter
class RateLimiter {
  private requests: number[] = [];
  private currentTokens = 0;

  canProceed(estimatedTokens: number): boolean {
    const now = Date.now();
    // Clean old requests outside the window
    this.requests = this.requests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT.windowMs,
    );

    // Calculate current token usage
    this.currentTokens = this.requests.length * 1000; // Rough estimate

    console.log(
      `[RateLimiter] Current tokens: ${this.currentTokens}/${RATE_LIMIT.maxTokensPerMinute}`,
    );

    if (this.currentTokens + estimatedTokens > RATE_LIMIT.maxTokensPerMinute) {
      console.warn(
        `[RateLimiter] Rate limit approaching. Current: ${this.currentTokens}, Estimated: ${estimatedTokens}`,
      );
      return false;
    }

    return true;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    const timeElapsed = Date.now() - oldestRequest;
    return Math.max(0, RATE_LIMIT.windowMs - timeElapsed);
  }
}

const rateLimiter = new RateLimiter();

// Enhanced retry utility with exponential backoff and rate limiting
async function retry<T>(
  fn: () => Promise<T>,
  retries = RATE_LIMIT.maxRetries,
  delay = RATE_LIMIT.baseDelay,
  context = "unknown",
): Promise<T> {
  console.log(`[Retry] Attempting ${context}, retries left: ${retries}`);

  try {
    return await fn();
  } catch (err: any) {
    console.error(`[Retry] Error in ${context}:`, err.message || err);

    if (retries <= 0) {
      console.error(`[Retry] Max retries exhausted for ${context}`);
      throw err;
    }

    // Handle rate limiting errors specifically
    if (err.message?.includes("rate limit") || err.status === 429) {
      const waitTime = rateLimiter.getWaitTime();
      console.warn(
        `[Retry] Rate limit hit, waiting ${waitTime}ms before retry`,
      );
      await new Promise((res) => setTimeout(res, Math.max(waitTime, delay)));
    } else {
      await new Promise((res) => setTimeout(res, delay));
    }

    return retry(fn, retries - 1, delay * 2, context);
  }
}

// Estimate token count (rough approximation)
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export async function askQuestion(question: string, projectId: string) {
  const stream = createStreamableValue();

  console.log(`[askQuestion] Starting request for project: ${projectId}`);
  console.log(`[askQuestion] Question length: ${question.length} chars`);

  if (!question?.trim() || !projectId?.trim()) {
    console.error("[askQuestion] Invalid input: missing question or projectId");
    stream.done("Invalid input: question and projectId are required.");
    return {
      output: stream.value,
      filesReferences: [],
    };
  }

  if (!process.env.GROQ_API_KEY) {
    console.error("[askQuestion] GROQ_API_KEY not configured");
    stream.done("Configuration error: GROQ_API_KEY not found.");
    return {
      output: stream.value,
      filesReferences: [],
    };
  }

  try {
    console.log("[askQuestion] Generating embedding for question");
    const queryVector = await retry(
      () => generateEmbedding(question),
      3,
      1000,
      "generateEmbedding",
    );

    console.log(
      `[askQuestion] Generated embedding with ${queryVector.length} dimensions`,
    );

    const vectorQuery = `[${queryVector.join(", ")}]`;

    console.log("[askQuestion] Querying database for similar documents");
    const result = (await db.$queryRaw`
      SELECT "fileName", "sourceCode", "summary",
      1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
      FROM "SourceCodeEmbedding"
      WHERE "projectId" = ${projectId}
      ORDER BY similarity DESC
      LIMIT 10;
    `) as {
      fileName: string;
      sourceCode: string;
      summary: string;
      similarity: number;
    }[];

    console.log(`[askQuestion] Found ${result.length} relevant documents`);

    if (result.length === 0) {
      console.warn("[askQuestion] No relevant documents found in database");
      stream.done(
        "No relevant code files found for this question in the project.",
      );
      return {
        output: stream.value,
        filesReferences: [],
      };
    }

    // Log similarity scores for debugging
    result.forEach((doc, index) => {
      console.log(
        `[askQuestion] Document ${index + 1}: ${doc.fileName} (similarity: ${doc.similarity?.toFixed(4)})`,
      );
    });

    const context = result
      .map(
        (doc) =>
          `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\nsummary of file: ${doc.summary}\n`,
      )
      .join("\n");

    const prompt = `You are an AI assistant who answers questions about codebases for technical interns.
START CONTEXT BLOCK
${context}
END CONTEXT BLOCK
START QUESTION
${question}
END QUESTION
Instructions:
- Base answers strictly on the CONTEXT BLOCK.
- If no answer is found in the context, say "I am sorry, but I don't know the answer."
- Don't apologize unless there's new information.
- Output in markdown with code snippets where applicable.
- Answer in a detailed and clear way.`;

    const estimatedTokens = estimateTokens(prompt);
    console.log(`[askQuestion] Estimated prompt tokens: ${estimatedTokens}`);

    // Check rate limiting before making the request
    if (!rateLimiter.canProceed(estimatedTokens)) {
      const waitTime = rateLimiter.getWaitTime();
      console.warn(
        `[askQuestion] Rate limit protection triggered, waiting ${waitTime}ms`,
      );
      await new Promise((res) => setTimeout(res, waitTime));
    }

    console.log("[askQuestion] Initiating Groq API call");
    const { textStream } = await retry(
      async () => {
        const result = streamText({
          model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
          prompt: prompt,
          temperature: 0.1,
          maxTokens: 4000,
        });
        return result;
      },
      3,
      2000,
      "streamText",
    );

    rateLimiter.recordRequest();
    console.log("[askQuestion] Successfully created text stream");

    // Stream answer to client
    (async () => {
      try {
        let totalTokens = 0;
        let streamedChunks = 0;

        for await (const delta of textStream) {
          stream.update(delta);
          totalTokens += estimateTokens(delta);
          streamedChunks++;

          if (streamedChunks % 10 === 0) {
            console.log(
              `[askQuestion] Streamed ${streamedChunks} chunks, ~${totalTokens} tokens`,
            );
          }
        }

        console.log(
          `[askQuestion] Stream completed successfully. Total chunks: ${streamedChunks}, Estimated tokens: ${totalTokens}`,
        );
        stream.done();
      } catch (err: any) {
        console.error(
          "[askQuestion] Error during streaming:",
          err.message || err,
        );
        console.error("[askQuestion] Stack trace:", err.stack);

        if (err.message?.includes("rate limit") || err.status === 429) {
          stream.done("Rate limit reached. Please try again in a few moments.");
        } else {
          stream.done(
            "Something went wrong while streaming the response. Please try again.",
          );
        }
      }
    })();

    return {
      output: stream.value,
      filesReferences: result,
    };
  } catch (err: any) {
    console.error("[askQuestion] Top-level error:", err.message || err);
    console.error("[askQuestion] Error details:", {
      name: err.name,
      status: err.status,
      stack: err.stack?.split("\n").slice(0, 5).join("\n"), // First 5 lines of stack
    });

    let errorMessage = "Something went wrong while processing your request.";

    if (err.message?.includes("rate limit") || err.status === 429) {
      errorMessage = "Rate limit reached. Please try again in a few moments.";
    } else if (err.message?.includes("API key") || err.status === 401) {
      errorMessage =
        "Authentication error. Please check your API configuration.";
    } else if (err.message?.includes("network") || err.code === "ECONNRESET") {
      errorMessage =
        "Network error. Please check your connection and try again.";
    }

    stream.done(errorMessage);
    return {
      output: stream.value,
      filesReferences: [],
    };
  }
}

/*
🏗️ System Architecture Flow
🔄 Complete Request Flow

📝 Input validation → Ensures question and projectId exist
🔐 Environment check → Validates API key configuration
🧮 Vector embedding → Converts question to semantic vector
🔍 Database search → Finds relevant code files using cosine similarity
📋 Context building → Combines relevant files into prompt context
🚦 Rate limiting → Checks and enforces API usage limits
🧠 LLM inference → Generates AI response using Groq/LLaMA
📡 Real-time streaming → Sends response chunks to client
🎁 Result packaging → Returns stream and file references
*/
