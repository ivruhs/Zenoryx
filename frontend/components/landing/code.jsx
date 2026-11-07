// Tiny, dependency-free JS/TS tokenizer for decorative code on marketing pages.
// (Real code views use react-syntax-highlighter; this keeps the landing bundle light.)
const KEYWORDS = new Set([
  "import", "from", "export", "const", "let", "var", "function", "async", "await", "return",
  "if", "else", "class", "new", "throw", "try", "catch", "of", "in", "for", "while", "typeof",
  "default", "null", "undefined", "true", "false", "this",
]);
const TYPES = new Set(["string", "number", "boolean", "void", "Promise", "Buffer", "Date", "Set", "Map"]);

const COLORS = {
  comment: "#5f5f6b",
  string: "#bfe383",
  number: "#ffc278",
  keyword: "#ff9580",
  fn: "#7fdcef",
  type: "#f2d38a",
  prop: "#aec4ff",
  ident: "#d4d4db",
  punct: "#7d7d89",
};

const TOKEN_RE =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z_$\d"'`]+)/g;

export function tokenize(line) {
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line))) {
    const [text, comment, str, num, ident, space] = m;
    let kind = "punct";
    if (comment) kind = "comment";
    else if (str) kind = "string";
    else if (num) kind = "number";
    else if (space) kind = "space";
    else if (ident) {
      const rest = line.slice(m.index + text.length);
      const prev = line.slice(0, m.index);
      if (KEYWORDS.has(text)) kind = "keyword";
      else if (TYPES.has(text) || /^[A-Z]/.test(text)) kind = "type";
      else if (/^\s*\(/.test(rest) || /^\s*=\s*(async\s*)?\(/.test(rest)) kind = "fn";
      else if (/\.\s*$/.test(prev)) kind = "prop";
      else kind = "ident";
    }
    out.push({ text, kind });
  }
  return out;
}

export function CodeText({ line }) {
  if (!line) return <span>&nbsp;</span>;
  return tokenize(line).map((t, i) =>
    t.kind === "space" ? (
      <span key={i}>{t.text}</span>
    ) : (
      <span key={i} style={{ color: COLORS[t.kind], fontStyle: t.kind === "comment" ? "italic" : undefined }}>
        {t.text}
      </span>
    ),
  );
}
