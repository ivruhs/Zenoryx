// // ✅ Fully Optimized indexGithubRepo.ts with Concurrency Protection & Rate Limiting

// import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
// import { Document } from "@langchain/core/documents";
// import { generateEmbedding, summariseCode } from "./gemini";
// import { db } from "../server/db";
// import pLimit from "p-limit";

// const CONCURRENCY_LIMIT = 3;

// export const loadGithubRepo = async (
//   githubUrl: string,
//   githubToken?: string,
// ): Promise<Document[]> => {
//   const loader = new GithubRepoLoader(githubUrl, {
//     accessToken: githubToken || "",
//     branch: "main",
//     ignoreFiles: [
//       "package-lock.json",
//       "yarn.lock",
//       "pnpm-lock.yaml",
//       "bun.lockb",
//     ],
//     recursive: true,
//     unknown: "warn",
//     maxConcurrency: 5,
//   });

//   return await loader.load();
// };

// export const indexGithubRepo = async (
//   projectId: string,
//   githubUrl: string,
//   githubToken?: string,
// ) => {
//   const docs = await loadGithubRepo(githubUrl, githubToken);
//   const allEmbeddings = await generateEmbeddings(docs);

//   const limit = pLimit(CONCURRENCY_LIMIT);

//   await Promise.allSettled(
//     allEmbeddings.map((embedding, index) =>
//       limit(async () => {
//         console.log(`Processing file ${index + 1} of ${allEmbeddings.length}`);

//         if (!embedding) return;

//         const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
//           data: {
//             summary: embedding.summary,
//             sourceCode: embedding.sourceCode,
//             fileName: embedding.fileName,
//             projectId,
//           },
//         });

//         await db.$executeRaw`
//           UPDATE "SourceCodeEmbedding"
//           SET "summaryEmbedding" = ${embedding.embedding}::vector
//           WHERE "id" = ${sourceCodeEmbedding.id}
//         `;
//       }),
//     ),
//   );
// };

// const generateEmbeddings = async (docs: Document[]) => {
//   const limit = pLimit(CONCURRENCY_LIMIT);

//   return await Promise.all(
//     docs.map((doc, index) =>
//       limit(async () => {
//         try {
//           const summary = await summariseCode(doc);
//           const embedding = await generateEmbedding(summary);

//           return {
//             summary,
//             embedding,
//             sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
//             fileName: doc.metadata.source,
//           };
//         } catch (err) {
//           console.error(`❌ Error processing document ${index}:`, err);
//           return null;
//         }
//       }),
//     ),
//   ).then((results) => results.filter(Boolean));
// };
