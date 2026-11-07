// Semantic code chunker.
//
// Naive RAG splits files every N characters, slicing functions in half. Instead we
// parse each file with Tree-sitter, walk the AST, and emit whole declarations
// (functions, classes, methods, interfaces...) as chunks. Anything the AST walk
// doesn't cover — imports, route wiring, top-level config — is gathered into
// "module" chunks so no code is silently dropped. Oversized declarations are
// descended into (class → methods) or windowed by lines.
//
// Chunks are sliced by *line* rather than by byte offset: Tree-sitter reports
// UTF-8 byte offsets while JS strings are UTF-16, so offset slicing corrupts any
// file containing non-ASCII text. Lines also give us GitHub deep links (#L10-L42).

const logger = require("./logger");

let Parser = null;
try {
  Parser = require("tree-sitter");
} catch (err) {
  logger.warn({ err: err.message }, "[chunker] tree-sitter unavailable; using line windows only");
}

const MAX_CHUNK_CHARS = 4000;
const WINDOW_CHARS = 2200;
const MIN_CHUNK_CHARS = 40;
const MAX_CHUNKS_PER_FILE = 60;

const GRAMMARS = {
  javascript: () => require("tree-sitter-javascript"),
  typescript: () => require("tree-sitter-typescript").typescript,
  tsx: () => require("tree-sitter-typescript").tsx,
  python: () => require("tree-sitter-python"),
  java: () => require("tree-sitter-java"),
  cpp: () => require("tree-sitter-cpp"),
};

const JS_TARGETS = [
  "function_declaration",
  "generator_function_declaration",
  "class_declaration",
  "abstract_class_declaration",
  "method_definition",
  "interface_declaration",
  "type_alias_declaration",
  "enum_declaration",
];

const TARGETS = {
  javascript: new Set(JS_TARGETS),
  typescript: new Set(JS_TARGETS),
  tsx: new Set(JS_TARGETS),
  python: new Set(["function_definition", "class_definition", "decorated_definition"]),
  java: new Set([
    "class_declaration",
    "interface_declaration",
    "enum_declaration",
    "record_declaration",
    "method_declaration",
    "constructor_declaration",
  ]),
  cpp: new Set(["function_definition", "class_specifier", "struct_specifier"]),
};

const FUNCTION_VALUE_TYPES = new Set([
  "arrow_function",
  "function",
  "function_expression",
  "generator_function",
  "class",
]);

const parserCache = new Map();
function getParser(language) {
  if (!Parser || !GRAMMARS[language]) return null;
  if (parserCache.has(language)) return parserCache.get(language);
  let parser = null;
  try {
    parser = new Parser();
    parser.setLanguage(GRAMMARS[language]());
  } catch (err) {
    logger.warn({ err: err.message, language }, "[chunker] failed to load grammar");
    parser = null;
  }
  parserCache.set(language, parser);
  return parser;
}

/** `const handler = async () => {}` — a declaration whose value is a function/class. */
function isFunctionVariable(node) {
  if (node.type !== "lexical_declaration" && node.type !== "variable_declaration") return false;
  for (let i = 0; i < node.namedChildCount; i++) {
    const decl = node.namedChild(i);
    if (decl.type !== "variable_declarator") continue;
    const value = decl.childForFieldName("value");
    if (value && FUNCTION_VALUE_TYPES.has(value.type)) return true;
  }
  return false;
}

function symbolName(node) {
  let target = node;
  if (node.type === "decorated_definition") target = node.childForFieldName("definition") || node;
  if (node.type === "lexical_declaration" || node.type === "variable_declaration") {
    const decl = node.namedChildren.find((c) => c.type === "variable_declarator");
    target = decl || node;
  }
  const name = target.childForFieldName && target.childForFieldName("name");
  if (name) return name.text.slice(0, 120);
  const declarator = target.childForFieldName && target.childForFieldName("declarator");
  if (declarator) {
    const inner = declarator.childForFieldName("declarator");
    return (inner || declarator).text.split("(")[0].slice(0, 120);
  }
  return null;
}

/** Line-window splitter used for fallback and for oversized regions. */
function windowLines(lines, startRow, endRow, meta = {}) {
  const out = [];
  let cursor = startRow;
  while (cursor <= endRow) {
    let size = 0;
    let end = cursor;
    while (end <= endRow && (size === 0 || size + lines[end].length + 1 <= WINDOW_CHARS)) {
      size += lines[end].length + 1;
      end++;
    }
    out.push({ startRow: cursor, endRow: end - 1, nodeType: meta.nodeType || "window", symbol: meta.symbol || null });
    if (end > endRow) break;
    cursor = Math.max(cursor + 1, end - 3); // 3 lines of overlap for context continuity
  }
  return out;
}

function regionText(lines, r) {
  return lines.slice(r.startRow, r.endRow + 1).join("\n");
}

const SMALL_CHUNK_CHARS = 900;
const MERGED_MAX_CHARS = 2400;

/** Packs runs of small neighbouring declarations into one chunk (fewer, richer embeddings). */
function mergeSmall(lines, regions) {
  const out = [];
  for (const r of regions) {
    const size = regionText(lines, r).length;
    const prev = out[out.length - 1];
    if (
      prev &&
      size < SMALL_CHUNK_CHARS &&
      prev._size < MERGED_MAX_CHARS &&
      prev._size + size <= MERGED_MAX_CHARS &&
      r.startRow - prev.endRow <= 2 &&
      r.startRow > prev.endRow
    ) {
      prev.endRow = r.endRow;
      prev._size += size;
      prev._symbols.push(r.symbol);
      prev.nodeType = prev.nodeType === r.nodeType ? r.nodeType : "group";
      continue;
    }
    out.push({ ...r, _size: size, _symbols: [r.symbol] });
  }
  return out.map(({ _size, _symbols, ...r }) => {
    const names = _symbols.filter(Boolean);
    return {
      ...r,
      symbol: names.length <= 1 ? names[0] || null : `${names.slice(0, 4).join(", ")}${names.length > 4 ? ` +${names.length - 4}` : ""}`,
    };
  });
}

function finalize(lines, regions) {
  const chunks = [];
  const seen = new Set();
  const unique = regions
    .sort((a, b) => a.startRow - b.startRow || b.endRow - a.endRow)
    .filter((r) => {
      const key = `${r.startRow}:${r.endRow}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  for (const r of mergeSmall(lines, unique)) {
    const content = regionText(lines, r);
    if (content.replace(/\s+/g, "").length < MIN_CHUNK_CHARS) continue;
    chunks.push({
      content,
      startLine: r.startRow + 1,
      endLine: r.endRow + 1,
      nodeType: r.nodeType,
      symbol: r.symbol,
    });
    if (chunks.length >= MAX_CHUNKS_PER_FILE) {
      logger.debug(`[chunker] truncating file at ${MAX_CHUNKS_PER_FILE} chunks`);
      break;
    }
  }
  return chunks.map((c, i) => ({ ...c, chunkIndex: i }));
}

function fallbackChunks(content) {
  const lines = content.split("\n");
  if (lines.length === 0) return [];
  return finalize(lines, windowLines(lines, 0, lines.length - 1));
}

function astChunks(content, language) {
  const parser = getParser(language);
  if (!parser) return null;

  const tree = parser.parse(content, null, { bufferSize: Buffer.byteLength(content, "utf8") * 2 + 1024 });
  const lines = content.split("\n");
  const targets = TARGETS[language];
  const regions = [];

  const isTarget = (n) => targets.has(n.type) || isFunctionVariable(n);
  const hasTargetDescendant = (n, depth = 0) => {
    if (depth > 6) return false;
    for (let i = 0; i < n.namedChildCount; i++) {
      const c = n.namedChild(i);
      if (isTarget(c) || hasTargetDescendant(c, depth + 1)) return true;
    }
    return false;
  };

  function walk(node, parentSymbol) {
    if (isTarget(node)) {
      // Include `export` / decorators that wrap the declaration.
      let span = node;
      if (span.parent && span.parent.type === "export_statement") span = span.parent;
      const name = symbolName(node);
      const symbol = parentSymbol && name ? `${parentSymbol}.${name}` : name;
      const startRow = span.startPosition.row;
      const endRow = span.endPosition.row;
      const text = regionText(lines, { startRow, endRow });

      if (text.length <= MAX_CHUNK_CHARS) {
        regions.push({ startRow, endRow, nodeType: node.type, symbol });
        return;
      }
      if (hasTargetDescendant(node)) {
        // Large class → keep its header (signature + fields) and descend into members.
        const firstChildRow = (() => {
          let row = endRow;
          const visit = (n) => {
            for (let i = 0; i < n.namedChildCount; i++) {
              const c = n.namedChild(i);
              if (isTarget(c)) row = Math.min(row, c.startPosition.row);
              else visit(c);
            }
          };
          visit(node);
          return row;
        })();
        if (firstChildRow > startRow) {
          regions.push(...windowLines(lines, startRow, Math.min(firstChildRow - 1, startRow + 40), { nodeType: `${node.type}_header`, symbol }));
        }
        for (let i = 0; i < node.namedChildCount; i++) walk(node.namedChild(i), symbol || parentSymbol);
        return;
      }
      regions.push(...windowLines(lines, startRow, endRow, { nodeType: node.type, symbol }));
      return;
    }
    for (let i = 0; i < node.namedChildCount; i++) walk(node.namedChild(i), parentSymbol);
  }

  walk(tree.rootNode, null);

  // Gather uncovered lines (imports, top-level statements, route wiring...).
  const covered = new Uint8Array(lines.length);
  for (const r of regions) for (let i = r.startRow; i <= r.endRow && i < lines.length; i++) covered[i] = 1;
  let gapStart = -1;
  for (let i = 0; i <= lines.length; i++) {
    const isGap = i < lines.length && !covered[i];
    if (isGap && gapStart === -1) gapStart = i;
    if (!isGap && gapStart !== -1) {
      const gap = { startRow: gapStart, endRow: i - 1 };
      if (regionText(lines, gap).replace(/\s+/g, "").length >= MIN_CHUNK_CHARS) {
        regions.push(...windowLines(lines, gap.startRow, gap.endRow, { nodeType: "module" }));
      }
      gapStart = -1;
    }
  }

  return finalize(lines, regions);
}

/**
 * Splits source code into semantic chunks.
 * @returns {{content:string, chunkIndex:number, startLine:number, endLine:number, nodeType:string, symbol:string|null}[]}
 */
function chunkCode(content, language) {
  if (typeof content !== "string") content = content == null ? "" : String(content);
  content = content.replace(/\r\n/g, "\n");
  if (!content.trim()) return [];

  if (GRAMMARS[language]) {
    try {
      const chunks = astChunks(content, language);
      if (chunks && chunks.length > 0) return chunks;
    } catch (err) {
      logger.warn({ err: err.message, language }, "[chunker] AST parse failed; falling back to line windows");
    }
  }
  return fallbackChunks(content);
}

module.exports = { chunkCode, fallbackChunks, MAX_CHUNK_CHARS };
