// ✅ Optimized summarization with GROQ (LLaMA-4 Scout) + Gemini Embeddings + Gemini Flash for commits

import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

// === ENV SETUP === //
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GEMINI_COMMIT_MODEL = "gemini-1.5-flash";

const TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 2;
const MAX_GROQ_TPM = 30000;
const MAX_GROQ_RPM = 30;
const MAX_GEMINI_RPM = 15;

// === GEMINI EMBEDDING SETUP === //
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});
const geminiCommitModel = genAI.getGenerativeModel({
  model: GEMINI_COMMIT_MODEL,
});

// === SIMPLE TOKENIZER (NO IMPORTS) === //
export function countTokens(text: string): number {
  const tokens = text
    .replace(/[\s\n]+/g, " ")
    .trim()
    .split(/\s+/);
  return tokens.length;
}

let groqTokensUsed = 0;
let lastGroqCall = 0;
let groqCalls = 0;

async function limitGroqRate(tokenCount: number) {
  const now = Date.now();

  if (groqCalls >= MAX_GROQ_RPM || groqTokensUsed + tokenCount > MAX_GROQ_TPM) {
    const delayTime = 60000 - (now - lastGroqCall);
    if (delayTime > 0) await delay(delayTime);
    groqCalls = 0;
    groqTokensUsed = 0;
  }

  lastGroqCall = Date.now();
  groqCalls++;
  groqTokensUsed += tokenCount;
}

let lastGeminiCall = 0;
let geminiCalls = 0;
async function limitGeminiRate() {
  const now = Date.now();
  if (geminiCalls >= MAX_GEMINI_RPM) {
    const delayTime = 60000 - (now - lastGeminiCall);
    if (delayTime > 0) await delay(delayTime);
    geminiCalls = 0;
  }
  lastGeminiCall = Date.now();
  geminiCalls++;
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// === IN-MEMORY CACHE === //
const summaryCache = new Map<string, string>();

// === SUMMARIZE COMMIT DIFF VIA DEEPSEEK CHAT V3 (OpenRouter) === //

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Rate limiter (15 requests/minute)
let deepseekTimestamps: number[] = [];

async function limitDeepseekRate() {
  const now = Date.now();
  deepseekTimestamps = deepseekTimestamps.filter((ts) => now - ts < 60000);
  if (deepseekTimestamps.length >= 15) {
    const waitTime = 60000 - (now - deepseekTimestamps[0]!);
    console.log(
      `[RateLimit] Waiting ${Math.ceil(waitTime / 1000)}s for DeepSeek`,
    );
    await delay(waitTime);
  }
  deepseekTimestamps.push(now);
}

export async function aiSummariseCommit(diff: string): Promise<string> {
  if (!diff || diff.trim().length === 0) return "No changes to summarize.";
  console.log(
    "[aiSummariseCommit] Summarizing commit diff via DeepSeek Chat V3...",
  );
  await limitDeepseekRate();

  const prompt = `Summarize the following Git diff in bullet points. Mention changed files and functions. Keep it under 100 words:\n\n${diff}`;

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-site.com", // Optional: update with your actual domain
        "X-Title": "Your App Name", // Optional: update with your actual app name
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[DeepSeek Commit Error]", res.status, errorText);
      return "⚠️ DeepSeek API error while generating commit summary.";
    }

    const data = await res.json();
    return (
      data.choices?.[0]?.message?.content?.trim() || "⚠️ No summary returned."
    );
  } catch (err) {
    console.error("[DeepSeek Commit Exception]", err);
    return "⚠️ Error generating commit summary.";
  }
}

// === SUMMARIZE SOURCE CODE FILES USING GROQ === //
export async function summariseCode(doc: Document) {
  const code = doc.pageContent.slice(0, 10000);
  const prompt = `You're onboarding a junior dev. Explain what this file does: ${doc.metadata.source}\n\nCode:\n${code}\n\nKeep the summary under 100 words.`;
  const tokenCount = countTokens(prompt);

  if (summaryCache.has(prompt)) return summaryCache.get(prompt)!;

  await limitGroqRate(tokenCount);
  console.log(`[summariseCode] Calling GROQ for ${doc.metadata.source}...`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: "You are an expert software engineer." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: TIMEOUT_MS,
        },
      );

      const summary = res.data.choices[0].message.content.trim();
      summaryCache.set(prompt, summary);
      return summary;
    } catch (err: any) {
      const retriable =
        err?.code === "ECONNABORTED" ||
        (err?.response?.status && err.response.status >= 500);
      console.warn(
        `[summariseCode] Retry ${attempt}/${MAX_ATTEMPTS} - Error:`,
        err?.message,
      );

      if (!retriable || attempt === MAX_ATTEMPTS)
        return "⚠️ Error summarizing source code.";
      await delay(2000);
    }
  }

  return "⚠️ Failed after retries.";
}

// === EMBEDDING GENERATION === //
export async function generateEmbedding(summary: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(summary);
    return result.embedding.values;
  } catch (err) {
    console.error("[Gemini Embedding Error]", err);
    return [];
  }
}
