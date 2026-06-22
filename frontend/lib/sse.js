// lib/sse.js

/**
 * See, our backend sends:
data: {"type":"sources","files":["App.js","index.js"]}

data: {"token":"The"}

data: {"token":" answer"}

data: {"token":" is"}

data: [DONE]
 * 
 * So, our frontend needs to 
 * 1. read stream continuously
 * 2. extract json
 * 3. update ui in real-time
 * 
 * This file does exactly that. 
 * 
 * Handlers:
onMetadata → source files
onToken → new token arrived
onDone → stream completed
onError → something exploded
 * 
 *
 * 
 */

export async function fetchSSE(url, options, handlers) {
  const { onMetadata, onToken, onDone, onError } = handlers;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to connect to stream.");
    }
    // instead of await response.json(), we need to read the stream continuously
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");

      // Keep the last incomplete chunk in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const cleanedLine = line.replace(/^data:\s*/, "").trim();

        if (!cleanedLine) continue;

        if (cleanedLine === "[DONE]") {
          onDone?.();
          return;
        }

        try {
          const parsed = JSON.parse(cleanedLine);

          if (parsed.error) {
            throw new Error(parsed.error);
          } else if (parsed.type === "sources") {
            onMetadata?.(parsed.files);
          } else if (parsed.token) {
            onToken?.(parsed.token);
          }
        } catch (e) {
          console.warn("Failed to parse SSE line:", cleanedLine, e);
        }
      }
    }
  } catch (error) {
    onError?.(error.message);
  }
}
