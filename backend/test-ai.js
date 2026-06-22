// ai models testing script

const geminiService = require("./src/services/gemini.service");
const groqService = require("./src/services/groq.service");

const testCode = `
function calculateFibonacci(n) {
  if (n <= 1) return n;
  return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
}
`;

const testDiff = `
+ const MAX_RETRIES = 5;
- const MAX_RETRIES = 3;
+ console.log('Retrying connection...');
`;

async function runTests() {
  console.log("🧪 Starting AI Services Test...\n");

  try {
    // 1. Test Groq Summary
    console.log("⏳ Testing Groq Summary (Flash)...");
    const summary = await geminiService.generateSummary(testCode);
    console.log("✅ Groq Summary Success:");
    console.log(summary, "\n");

    // 2. Test Gemini Embeddings
    console.log("⏳ Testing Gemini Embeddings...");
    const embedding = await geminiService.generateEmbedding(testCode);
    console.log("✅ Gemini Embeddings Success:");
    console.log(
      `Returned an array with ${embedding.length} dimensions. (Should be 3072)\n`,
    );

    // 3. Test Groq Diff Summarization
    console.log("⏳ Testing Groq Llama3 (Diff Summarization)...");
    const diffSummary = await groqService.summarizeDiff(testDiff);
    console.log("✅ Groq Diff Success:");
    console.log(diffSummary, "\n");

    console.log(
      "🎉 ALL AI TESTS PASSED! Your keys are active and models are responding.",
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ AI TEST FAILED!");
    console.error(error.message);
    process.exit(1);
  }
}

runTests();
