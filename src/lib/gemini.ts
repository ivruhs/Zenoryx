// ✅ Optimized gemini.ts using Ollama for summarization (CodeLlama 7B) and Gemini for embeddings

import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { spawn } from "child_process";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Gemini embedding model
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

// Utility: Run Ollama prompt using `ollama run`
async function runOllamaPrompt(model: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ollama = spawn("ollama", ["run", model], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let error = "";

    ollama.stdout.on("data", (data) => {
      output += data.toString();
    });

    ollama.stderr.on("data", (data) => {
      error += data.toString();
    });

    ollama.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Ollama exited with code ${code}: ${error}`));
      }
    });

    ollama.stdin.write(prompt);
    ollama.stdin.end();
  });
}

export const aiSummariseCommit = async (diff: string) => {
  try {
    console.log("[aiSummariseCommit] Starting summarization...");

    if (!diff || diff.trim().length === 0) {
      console.warn("[aiSummariseCommit] Empty or invalid diff provided.");
      return "No changes to summarize.";
    }

    const prompt = `You are an expert programmer summarizing the following Git diff.\n\n${diff}\n\nSummarize the changes clearly in bullet points, mentioning impacted files and functions. Keep it under 100 words.`;

    console.log(
      "[aiSummariseCommit] Sending prompt to Ollama (codellama:7b-instruct)...",
    );
    const summary = await runOllamaPrompt("codellama:7b-instruct", prompt);

    console.log("[aiSummariseCommit] Summary generated successfully.");
    return summary;
  } catch (error) {
    console.error("[aiSummariseCommit] Failed to generate summary.");
    console.error(error);
    return "⚠️ Error generating commit summary.";
  }
};

export async function summariseCode(doc: Document) {
  console.log("[summariseCode] Getting summary for", doc.metadata.source);
  try {
    const code = doc.pageContent.slice(0, 10000);
    const prompt = `You are onboarding a junior engineer. Explain what the following file does: ${doc.metadata.source}\n\nCode:\n\n${code}\n\nGive a summary under 100 words explaining its purpose and key functions.`;

    const summary = await runOllamaPrompt("codellama:7b-instruct", prompt);
    return summary;
  } catch (error) {
    console.error("[summariseCode] Error:", error);
    return "";
  }
}

export async function generateEmbedding(summary: string) {
  const result = await embeddingModel.embedContent(summary);
  return result.embedding.values;
}
