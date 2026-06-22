// stores/chatStore.js

/**
 * This store handles the state for streaming answers bcoz our backend streams the answer token by token using SSE events.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useChatStore = create(
  persist(
    (set) => ({
      // --- PERSISTED STATE ---
      histories: {}, // Shape: { "project-id-123": [ { role, content, sources } ] }

      addMessageToHistory: (projectId, message) =>
        set((state) => {
          const currentHistory = state.histories[projectId] || [];
          return {
            histories: {
              ...state.histories,
              [projectId]: [...currentHistory, message],
            },
          };
        }),

      clearAllHistories: () => set({ histories: {} }),

      // NEW: Wipe history for a single project
      clearProjectHistory: (projectId) =>
        set((state) => {
          const newHistories = { ...state.histories };
          delete newHistories[projectId];
          return { histories: newHistories };
        }),

      // --- EPHEMERAL STATE (Wiped on refresh) ---
      streamingAnswer: "",
      sourceFiles: [],
      isStreaming: false,

      setStreaming: (isStreaming) => set({ isStreaming }),
      setSourceFiles: (files) => set({ sourceFiles: files }),
      appendToken: (token) =>
        set((state) => ({ streamingAnswer: state.streamingAnswer + token })),
      resetStream: () =>
        set({ streamingAnswer: "", sourceFiles: [], isStreaming: true }),
    }),
    {
      name: "zenoryx-chat-storage",
      // Explicitly bind to sessionStorage instead of the default localStorage
      storage: createJSONStorage(() => sessionStorage),
      // ONLY save the histories object. Let the stream state reset on reload.
      partialize: (state) => ({ histories: state.histories }),
    },
  ),
);

/**
streamingAnswer
→ Current answer being generated

sourceFiles
→ Files used as sources

isStreaming
→ Is AI still typing?

appendToken()
→ Adds incoming SSE tokens

setSourceFiles()
→ Stores source files

resetStream()
→ Clears old answer and starts new stream
 */
