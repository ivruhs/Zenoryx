"use client";

import { useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import ruby from "react-syntax-highlighter/dist/esm/languages/prism/ruby";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";
import kotlin from "react-syntax-highlighter/dist/esm/languages/prism/kotlin";
import swift from "react-syntax-highlighter/dist/esm/languages/prism/swift";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import { Check, Copy } from "lucide-react";
import { prismLanguage } from "@/lib/languages";
import { cn } from "@/lib/format";

Object.entries({ jsx, tsx, typescript, python, java, cpp, c, csharp, go, rust, ruby, php, kotlin, swift, bash, json, css, markup, sql, markdown, yaml }).forEach(
  ([name, lang]) => SyntaxHighlighter.registerLanguage(name, lang),
);

// "Riso" theme — spot-ink token colours on white card stock.
const base = { color: "#2a2620", background: "transparent", fontFamily: "var(--font-mono)", fontSize: "12.5px", lineHeight: "1.75" };
export const inkTheme = {
  'code[class*="language-"]': base,
  'pre[class*="language-"]': { ...base, margin: 0, padding: 0, overflow: "auto" },
  comment: { color: "#9a917f", fontStyle: "italic" },
  prolog: { color: "#9a917f" },
  doctype: { color: "#9a917f" },
  punctuation: { color: "#7a7366" },
  operator: { color: "#7a7366" },
  keyword: { color: "#2b59c3", fontWeight: "bold" },
  "class-name": { color: "#b0570f" },
  function: { color: "#00875a" },
  "function-variable": { color: "#00875a" },
  builtin: { color: "#00875a" },
  string: { color: "#c41f6e" },
  "template-string": { color: "#c41f6e" },
  char: { color: "#c41f6e" },
  regex: { color: "#b0570f" },
  number: { color: "#d4541a" },
  boolean: { color: "#d4541a" },
  constant: { color: "#d4541a" },
  property: { color: "#4a3fa8" },
  "attr-name": { color: "#b0570f" },
  "attr-value": { color: "#c41f6e" },
  tag: { color: "#2b59c3" },
  selector: { color: "#c41f6e" },
  variable: { color: "#2a2620" },
  parameter: { color: "#2a2620" },
  "maybe-class-name": { color: "#b0570f" },
  important: { color: "#c41f6e", fontWeight: "bold" },
  deleted: { color: "#c41f6e" },
  inserted: { color: "#00875a" },
};

export function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={cn("icon-btn size-7", className)}
      aria-label={copied ? "Copied" : "Copy code"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? <Check className="size-3.5 text-green" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/**
 * @param {{ code: string, language?: string, startLine?: number, showLineNumbers?: boolean,
 *           highlight?: [number, number], title?: React.ReactNode, actions?: React.ReactNode, className?: string, maxHeight?: number }} props
 */
export function CodeBlock({ code, language, startLine = 1, showLineNumbers = true, highlight, title, actions, className, maxHeight }) {
  const lang = prismLanguage(language);
  return (
    <div className={cn("overflow-hidden rounded-xl border-[1.5px] border-ink bg-paper-2", className)}>
      {(title || actions) && (
        <div className="flex h-9 items-center justify-between gap-2 border-b-[1.5px] border-dashed border-ink/30 bg-paper pl-3 pr-1">
          <div className="min-w-0 truncate font-mono text-xs text-ink-2">{title}</div>
          <div className="flex items-center gap-0.5">
            {actions}
            <CopyButton text={code} />
          </div>
        </div>
      )}
      <div className="scroll-thin overflow-auto py-3" style={maxHeight ? { maxHeight } : undefined}>
        <SyntaxHighlighter
          language={lang}
          style={inkTheme}
          showLineNumbers={showLineNumbers}
          startingLineNumber={startLine}
          wrapLines={Boolean(highlight) || showLineNumbers}
          lineNumberStyle={{ minWidth: "3.25em", paddingRight: "1.25em", color: "#2b59c3", opacity: 0.45, textAlign: "right", userSelect: "none" }}
          lineProps={(n) => {
            const on = highlight && n >= highlight[0] && n <= highlight[1];
            return {
              style: {
                display: "block",
                paddingRight: "1rem",
                paddingLeft: showLineNumbers ? 0 : "1rem",
                background: on ? "var(--color-yellow-soft)" : undefined,
                boxShadow: on ? "inset 3px 0 0 var(--color-pink)" : undefined,
              },
            };
          }}
          codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
        >
          {code.replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
