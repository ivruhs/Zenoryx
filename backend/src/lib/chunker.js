// src/lib/chunker.js

// Note: we canot feed a 3k line file to AI directly, it exceeds the context window and dilutes the semantic meaning of the code. The file must be cut into smaller "chunks".
// A naive splitter chops code every 1k characters. This often clices a function cleanly in half-leaving the signature in Chunk 1 and logic in Chunk 2. When embedded into vectors, both halves lose their meaning.
// So to avoid this, we use tree-sitter. It reads the code and constructs an Abstract Syntax Tree (AST). A map of the code's structural logic. We command the chunker to "walk" this tree and cut only when its finds a complete function or class. If it hits an unknown language, it degrades gracefully to a fallback character splitter.

const Parser = require("tree-sitter");
const logger = require("./logger");

const grammars = {
  javascript: () => require("tree-sitter-javascript"),

  typescript: () => require("tree-sitter-typescript").typescript,

  tsx: () => require("tree-sitter-typescript").tsx,

  python: () => require("tree-sitter-python"),

  java: () => require("tree-sitter-java"),

  cpp: () => require("tree-sitter-cpp"),

  html: () =>
    require("tree-sitter-html").default || require("tree-sitter-html"),
};

/**
 * The "dumb" fallback strategy if AST fails. Slices blindly by character count.
 */

function fallbackChunkCode(content) {
  logger.debug("Using fallback character chunker");
  const CHUNK_SIZE = 1500;
  const OVERLAP = 200;
  const chunks = [];

  for (let i = 0; i < content.length; i += CHUNK_SIZE - OVERLAP) {
    chunks.push({
      content: content.substring(i, i + CHUNK_SIZE),
      chunkIndex: chunks.length,
    });
  }
  return chunks;
}

/**
 * The "smart" strategy. Uses AST to extract whole, intact functions and classes.
 */
function chunkCode(content, languageName) {
  if (!grammars[languageName]) {
    logger.warn(`No AST grammar for ${languageName}, using fallback.`);
    return fallbackChunkCode(content);
  }

  try {
    const parser = new Parser();
    parser.setLanguage(grammars[languageName]());

    const tree = parser.parse(content);
    const chunks = [];

    // The specific syntactic blocks we consider to be "whole units of meaning"
    const targetNodeTypes = new Set([
      "function_declaration",
      "arrow_function",
      "class_declaration",
      "method_definition",
      "function_definition", // For Python
    ]);

    // Recursively walk down the syntax tree
    function walk(node) {
      if (targetNodeTypes.has(node.type)) {
        // 🚨 PREVENT AST FRAGMENTATION FOR CALLBACKS 🚨
        if (node.type === "arrow_function") {
          // If the arrow function is an argument to another function (like .then, .map, setInterval)
          const parentType = node.parent ? node.parent.type : null;
          if (parentType === "arguments" || parentType === "call_expression") {
            // It is an inline callback. Do NOT extract it as an isolated chunk.
            // Dig deeper into its children instead.
            for (let i = 0; i < node.namedChildCount; i++) {
              walk(node.namedChild(i));
            }
            return; // Exit early
          }
        }

        // If it passes the check, slice the exact start and end bytes
        chunks.push({
          content: content.substring(node.startIndex, node.endIndex),
          chunkIndex: chunks.length,
        });
      } else {
        // Otherwise, keep digging deeper into the children
        for (let i = 0; i < node.namedChildCount; i++) {
          walk(node.namedChild(i));
        }
      }
    }

    walk(tree.rootNode);

    // If the file had no isolated functions, use the character-based fallback
    if (chunks.length === 0) {
      return fallbackChunkCode(content);
    }

    return chunks;
  } catch (error) {
    logger.error(error, `AST parsing failed for ${languageName}`);
    return fallbackChunkCode(content);
  }
}

module.exports = {
  chunkCode,
};
