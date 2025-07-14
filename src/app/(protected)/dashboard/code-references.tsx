"use client";

import React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import { cn } from "../../../lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { lucario } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FileCode, Copy } from "lucide-react";
import { Button } from "../../../components/ui/button";

type Props = {
  fileRefereces: { fileName: string; sourceCode: string; summary: string }[];
};

const CodeReferences = ({ fileRefereces }: Props) => {
  const [tab, setTab] = React.useState(fileRefereces[0]?.fileName);

  if (fileRefereces.length === 0) return null;

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="w-full">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Referenced Files
            </h3>
          </div>
        </div>

        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-xl bg-slate-100 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 dark:bg-slate-800">
          {fileRefereces.map((file) => (
            <TabsTrigger
              key={file.fileName}
              value={file.fileName}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100",
                "hover:bg-white/50 dark:hover:bg-slate-700/50",
              )}
            >
              <span className="max-w-[120px] truncate">{file.fileName}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {fileRefereces.map((file) => (
          <TabsContent
            key={file.fileName}
            value={file.fileName}
            className="mt-6 space-y-4"
          >
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-300">
                    {file.fileName}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(file.sourceCode)}
                  className="h-8 px-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-[50vh] overflow-auto">
                <SyntaxHighlighter
                  language="typescript"
                  style={lucario}
                  customStyle={{
                    margin: 0,
                    background: "transparent",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                >
                  {(() => {
                    try {
                      // Step 1: Ensure input is string
                      let rawCode = String(file.sourceCode ?? "");

                      // Step 2: If it's double-encoded like "\"const x = 1;\\nconsole.log(x);\""
                      if (rawCode.startsWith('"') && rawCode.endsWith('"')) {
                        rawCode = JSON.parse(rawCode);
                      }

                      // Step 3: If it's valid JSON, pretty-print it
                      try {
                        const parsed = JSON.parse(rawCode);
                        rawCode = JSON.stringify(parsed, null, 2);
                      } catch {
                        // Not valid JSON, skip pretty-printing
                      }

                      return rawCode;
                    } catch (e) {
                      console.error("Highlighting error:", e);
                      return "// Invalid code content";
                    }
                  })()}
                </SyntaxHighlighter>
              </div>
            </div>

            {file.summary && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
                  Summary
                </h4>
                <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                  {file.summary}
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CodeReferences;
