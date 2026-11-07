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

// "Ink" theme — restrained, high-legibility token colours.
const base = { color: "#d4d4db", background: "transparent", fontFamily: "var(--font-mono)", fontSize: "12.5px", lineHeight: "1.7" };
export const inkTheme = {
  'code[class*="language-"]': base,
  'pre[class*="language-"]': { ...base, margin: 0, padding: 0, overflow: "auto" },
  comment: { color: "#5f5f6b", fontStyle: "italic" },
  prolog: { color: "#5f5f6b" },
  doctype: { color: "#5f5f6b" },
  punctuation: { color: "#7d7d89" },
  operator: { color: "#9c9ca8" },
  keyword: { color: "#ff9580" },
  "class-name": { color: "#f2d38a" },
  function: { color: "#7fdcef" },
  "function-variable": { color: "#7fdcef" },
  builtin: { color: "#7fdcef" },
  string: { color: "#bfe383" },
  "template-string": { color: "#bfe383" },
  char: { color: "#bfe383" },
  regex: { color: "#f2d38a" },
  number: { color: "#ffc278" },
  boolean: { color: "#ffc278" },
  constant: { color: "#ffc278" },
  property: { color: "#aec4ff" },
  "attr-name": { color: "#ffc278" },
  "attr-value": { color: "#bfe383" },
  tag: { color: "#ff9580" },
  selector: { color: "#bfe383" },
  variable: { color: "#d4d4db" },
  parameter: { color: "#e6e6ec" },
  "maybe-class-name": { color: "#f2d38a" },
  important: { color: "#ff9580", fontWeight: "bold" },
  deleted: { color: "#ff6b5b" },
  inserted: { color: "#c8f542" },
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
      {copied ? <Check className="size-3.5 text-signal" /> : <Copy className="size-3.5" />}
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
    <div className={cn("overflow-hidden rounded-xl border hairline bg-ink-950", className)}>
      {(title || actions) && (
        <div className="flex h-9 items-center justify-between gap-2 border-b hairline bg-ink-900 pl-3 pr-1">
          <div className="min-w-0 truncate font-mono text-xs text-fg-subtle">{title}</div>
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
          lineNumberStyle={{ minWidth: "3.25em", paddingRight: "1.25em", color: "#45454e", textAlign: "right", userSelect: "none" }}
          lineProps={(n) => {
            const on = highlight && n >= highlight[0] && n <= highlight[1];
            return {
              style: {
                display: "block",
                paddingRight: "1rem",
                paddingLeft: showLineNumbers ? 0 : "1rem",
                background: on ? "color-mix(in oklab, var(--color-signal) 7%, transparent)" : undefined,
                boxShadow: on ? "inset 2px 0 0 var(--color-signal)" : undefined,
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
