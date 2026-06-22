// hooks/useQaStream.js

/**
 * This hook connects our Chat UI to the backend QA engine.
User types question
        │
        ▼
useQaStream()
        │
        ▼
fetchSSE()
        │
        ▼
Backend /qa
        │
        ▼
Groq/Gemini Streaming
        │
        ▼
Zustand Store
        │
        ▼
Chat UI updates live
 * 
 * We are creating a custom hook.
 * const {askQuestion} = useQaStream(projectId)
 * Then we can call askQuestion(question) to send a question to the backend.
 * 
 * streamIdRef is stream identifier. If question 2 starts before question1 finishes, we don't want question 1's tokens appearing inside question 2's answer. So we increment streamIdRef for every new question, and only accept tokens from the latest stream.
 */

import { useRef, useCallback } from "react";
import { useChatStore } from "@/stores/chatStore";
import { fetchSSE } from "@/lib/sse";
import { toast } from "sonner";

export function useQaStream(projectId) {
  const streamIdRef = useRef(0);
  const { appendToken, setSourceFiles, setStreaming, resetStream } =
    useChatStore();

  const askQuestion = useCallback(
    async (question) => {
      if (!question.trim()) return;

      // 1. Increment connection ID to orphan any previous stuck streams
      const currentStreamId = ++streamIdRef.current;

      // 2. Wipe the Zustand buffer clean
      resetStream();

      // 3. Connect to the backend
      await fetchSSE(
        `${process.env.NEXT_PUBLIC_API_URL}/qa`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ projectId, question }),
        },
        {
          onMetadata: (files) => {
            if (streamIdRef.current === currentStreamId) setSourceFiles(files);
          },
          onToken: (token) => {
            if (streamIdRef.current === currentStreamId) appendToken(token);
          },
          onDone: () => {
            if (streamIdRef.current === currentStreamId) setStreaming(false);
          },
          onError: (errorMsg) => {
            if (streamIdRef.current === currentStreamId) {
              setStreaming(false);
              toast.error(errorMsg);
            }
          },
        },
      );
    },
    [projectId, appendToken, setSourceFiles, setStreaming, resetStream],
  );

  return { askQuestion };
}

/**
 * Complete flow:
User types question
        │
        ▼
askQuestion()
        │
        ▼
resetStream()
        │
        ▼
POST /qa
        │
        ▼
Backend
        │
        ▼
Gemini Embedding
        │
        ▼
Vector Search
        │
        ▼
Top Chunks
        │
        ▼
Groq/Gemini
        │
        ▼
SSE Stream
        │
        ├── sources
        ├── token
        ├── token
        ├── token
        └── DONE
        │
        ▼
fetchSSE()
        │
        ▼
Zustand Store
        │
        ▼
React UI Updates Live
 */
